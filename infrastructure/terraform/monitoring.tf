locals {
  moodle_host = trimprefix(local.moodle_url, "https://")
  run_filter  = "resource.type=\"cloud_run_revision\" AND resource.label.service_name=\"${var.project_name}-web\""
  sql_filter  = "resource.type=\"cloudsql_database\" AND resource.label.database_id=\"${var.project_id}:${var.project_name}-mysql\""
}

resource "google_monitoring_notification_channel" "email" {
  display_name = "Moodle - correo de alertas"
  type         = "email"
  labels       = { email_address = var.alert_email }
  depends_on   = [google_project_service.apis]
}

# Disponibilidad: la página de acceso debe responder 200 desde varias regiones.
resource "google_monitoring_uptime_check_config" "moodle" {
  display_name = "Moodle login"
  timeout      = "10s"
  period       = "300s"
  http_check {
    path           = "/login/index.php"
    port           = 443
    use_ssl        = true
    validate_ssl   = true
    request_method = "GET"
    accepted_response_status_codes { status_class = "STATUS_CLASS_2XX" }
  }
  monitored_resource {
    type   = "uptime_url"
    labels = { project_id = var.project_id, host = local.moodle_host }
  }
  depends_on = [google_project_service.apis]
}

resource "google_monitoring_alert_policy" "uptime" {
  display_name          = "Moodle no disponible"
  combiner              = "OR"
  notification_channels = [google_monitoring_notification_channel.email.id]
  conditions {
    display_name = "Uptime check fallido"
    condition_threshold {
      filter          = "metric.type=\"monitoring.googleapis.com/uptime_check/check_passed\" AND metric.label.check_id=\"${google_monitoring_uptime_check_config.moodle.uptime_check_id}\" AND resource.type=\"uptime_url\""
      comparison      = "COMPARISON_GT"
      threshold_value = 1
      duration        = "600s"
      aggregations {
        alignment_period     = "1200s"
        per_series_aligner   = "ALIGN_NEXT_OLDER"
        cross_series_reducer = "REDUCE_COUNT_FALSE"
        group_by_fields      = ["resource.label.*"]
      }
      trigger { count = 1 }
    }
  }
  documentation {
    content   = "La página de acceso de Moodle no responde desde al menos dos regiones. Revisa Cloud Run y Cloud SQL."
    mime_type = "text/markdown"
  }
}

resource "google_monitoring_alert_policy" "errors_5xx" {
  display_name          = "Moodle errores HTTP 5xx"
  combiner              = "OR"
  notification_channels = [google_monitoring_notification_channel.email.id]
  conditions {
    display_name = "Más de 5 respuestas 5xx en 5 minutos"
    condition_threshold {
      filter          = "${local.run_filter} AND metric.type=\"run.googleapis.com/request_count\" AND metric.label.response_code_class=\"5xx\""
      comparison      = "COMPARISON_GT"
      threshold_value = 5
      duration        = "0s"
      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_DELTA"
        cross_series_reducer = "REDUCE_SUM"
      }
      trigger { count = 1 }
    }
  }
  alert_strategy {
    auto_close = "1800s"
  }
}

resource "google_monitoring_alert_policy" "sql_cpu" {
  display_name          = "Cloud SQL CPU alta"
  combiner              = "OR"
  notification_channels = [google_monitoring_notification_channel.email.id]
  conditions {
    display_name = "CPU de MySQL > 80% durante 10 minutos"
    condition_threshold {
      filter          = "${local.sql_filter} AND metric.type=\"cloudsql.googleapis.com/database/cpu/utilization\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0.8
      duration        = "600s"
      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_MEAN"
      }
      trigger { count = 1 }
    }
  }
}

# Cuenta errores PHP escritos por Apache/PHP en stderr del contenedor.
resource "google_logging_metric" "php_errors" {
  name   = "moodle_php_errors"
  filter = "${local.run_filter} AND textPayload=~\"PHP (Fatal error|Warning|Parse error)\""
  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
  }
}

resource "google_monitoring_dashboard" "moodle" {
  dashboard_json = jsonencode({
    displayName = "Moodle en GCP"
    mosaicLayout = {
      columns = 12
      tiles = [for i, w in [
        { title = "Solicitudes por clase de respuesta", filter = "${local.run_filter} AND metric.type=\"run.googleapis.com/request_count\"", aligner = "ALIGN_RATE", reducer = "REDUCE_SUM", group = ["metric.label.response_code_class"] },
        { title = "Latencia p95 (ms)", filter = "${local.run_filter} AND metric.type=\"run.googleapis.com/request_latencies\"", aligner = "ALIGN_PERCENTILE_95", reducer = "REDUCE_MAX", group = [] },
        { title = "CPU del contenedor", filter = "${local.run_filter} AND metric.type=\"run.googleapis.com/container/cpu/utilizations\"", aligner = "ALIGN_PERCENTILE_95", reducer = "REDUCE_MAX", group = [] },
        { title = "Memoria del contenedor", filter = "${local.run_filter} AND metric.type=\"run.googleapis.com/container/memory/utilizations\"", aligner = "ALIGN_PERCENTILE_95", reducer = "REDUCE_MAX", group = [] },
        { title = "Instancias de Cloud Run", filter = "${local.run_filter} AND metric.type=\"run.googleapis.com/container/instance_count\"", aligner = "ALIGN_MAX", reducer = "REDUCE_SUM", group = ["metric.label.state"] },
        { title = "Cloud SQL - CPU", filter = "${local.sql_filter} AND metric.type=\"cloudsql.googleapis.com/database/cpu/utilization\"", aligner = "ALIGN_MEAN", reducer = "REDUCE_MEAN", group = [] },
        { title = "Cloud SQL - conexiones", filter = "${local.sql_filter} AND metric.type=\"cloudsql.googleapis.com/database/network/connections\"", aligner = "ALIGN_MEAN", reducer = "REDUCE_SUM", group = [] },
        { title = "Uptime check superado", filter = "metric.type=\"monitoring.googleapis.com/uptime_check/check_passed\" AND resource.type=\"uptime_url\"", aligner = "ALIGN_FRACTION_TRUE", reducer = "REDUCE_MEAN", group = [] },
        ] : {
        xPos   = (i % 2) * 6
        yPos   = floor(i / 2) * 4
        width  = 6
        height = 4
        widget = {
          title = w.title
          xyChart = {
            dataSets = [{
              plotType = "LINE"
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = w.filter
                  aggregation = {
                    alignmentPeriod    = "60s"
                    perSeriesAligner   = w.aligner
                    crossSeriesReducer = w.reducer
                    groupByFields      = w.group
                  }
                }
              }
            }]
          }
        }
      }]
    }
  })
  depends_on = [google_project_service.apis]
}
