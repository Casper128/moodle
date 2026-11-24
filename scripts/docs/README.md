# Generación de evidencias y entregables

Requiere Google Chrome, LibreOffice y Poppler. Ejecuta desde esta carpeta:

```sh
npm install
node informe.js ../.. && (cd ../../docs/entregable && soffice --headless --convert-to pdf Informe_Final_Moodle_GCP.docx)
python3 toc_pages.py ../../docs/entregable/Informe_Final_Moodle_GCP.pdf   # números de página del índice
node informe.js ../.. && (cd ../../docs/entregable && soffice --headless --convert-to pdf Informe_Final_Moodle_GCP.docx)
node presentacion.js ../..
```

- `shot.js`: capturas de páginas web reales o de logs reales de terminal.
- `moodle-test.js`: prueba funcional en la URL pública. La contraseña se lee de Secret Manager en la variable `MOODLE_PASS` y nunca se escribe en disco.
