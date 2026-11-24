import json, subprocess, sys
pdf = sys.argv[1]; heads = json.load(open('heads.json'))
n = int([l for l in subprocess.check_output(['pdfinfo', pdf], text=True).splitlines() if l.startswith('Pages')][0].split()[-1])
pages = {}
texts = [subprocess.check_output(['pdftotext', '-layout', '-f', str(i), '-l', str(i), pdf, '-'], text=True) for i in range(1, n + 1)]
toc_end = max(i for i, tx in enumerate(texts) if 'Tabla de contenido' in tx)  # última página del índice
for lvl, h in heads:
    for i in range(toc_end + 1, n):
        lines = [l.strip() for l in texts[i].splitlines()]
        if any(l == h for l in lines):
            pages[h] = i  # número impreso = índice PDF (base 0) porque la portada no se numera
            break
json.dump(pages, open('pages.json', 'w'), ensure_ascii=False)
missing = [h for _, h in heads if h not in pages]
print('encabezados', len(heads), 'localizados', len(pages), 'faltan', missing)
