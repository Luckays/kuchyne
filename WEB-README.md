# Náš byt – web po místnostech

Web zobrazuje celý byt podle modelu revize 20. Původní soubory jednotlivé místnosti zůstaly zachované; aktuální vstup pro celý byt je `apartment-model.json`.

## Úpravy a sestavení

- `site-shell.html`: rozložení a ovládací prvky.
- `site.css`: responzivní vzhled.
- `site-app.js`: navigace a obsah přehledů místností.
- `apartment-viewer.html`: původní prohlížeč modelu revize 20.
- `room-adapter.js`: samostatné místnosti, filtry instalačních bodů a ovládání klávesnicí.
- `model-updates.cjs`: aktuální změny základního modelu; dveře WC do pouzdra. Při otevření se křídlo skryje uvnitř stěny, ostatní dveře zůstávají otočné.
- `build-site.cjs`: sestavení jediného samostatného `index.html`, bez externích síťových závislostí.

Po úpravách spusťte `node build-site.cjs` a commitněte také vzniklý `index.html`. Stávající GitHub Pages workflow publikuje právě tento soubor.

Volitelná kontrola rendereru: `node check-site.cjs` (vyžaduje `@napi-rs/canvas` v prostředí; není závislostí webu). Ověřuje deset pohledů při dvou velikostech plátna, přepínače a filtrování instalačních bodů. Nejde o vizuální test v prohlížeči ani stavební kontrolu.

Přímé odkazy: `#living`, `#office`, `#children`, `#bedroom`, `#bath`, `#wc`, `#wardrobe`, `#hall`, `#balcony`. `#all` ukáže celek.

Rozměry a technické rozvody jsou návrhové. Poznámky k neověřeným kombinacím spotřebičů, spádům, elektroinstalaci, klimatizaci a průchodům jsou zachovány v přehledech.
