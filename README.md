# Magic Mirror – MVP

Vaikas stovi prieš telefoną, o televizoriuje mato save kaip šuniuką Rudį, kuris kartoja jo judesius. Žaidimas duoda judėjimo užduotis, atpažįsta, ar jos atliktos, ir už jas duoda monetų.

## Kas veikia šioje versijoje

- **Personažas:** šuniukas Rudis, piešiamas realiu laiku pagal 33 kūno taškus. Atkartoja rankas, kojas, galvos pasisukimą, šuolius. Išsižiojus atsiveria burna, primerkus akį – užsimerkia.
- **10 užduočių su tikru atpažinimu:** pakelk rankas, pamojuok, suplok 3 kartus, pašok 5 kartus, pritūpk 3 kartus, pasisuk į abi puses, pastovėk ant vienos kojos, juokingas veidas, zuikučio šuoliai, superherojaus poza.
- **Monetos:** lengva užduotis 10, vidutinė 20, speciali 30, už įveiktą etapą (5 užduotys) +25 premija.
- **Daiktai:** už monetas perkami aksesuarai (kepurė, šalikėlis, akiniai, karūna) ir pasauliai (parkas, saldainių šalis, kosmosas).
- **Režimai:** Užduotys ir Laisvas žaidimas (šuniukas loja, kai išsižioji, ir žėri, kai pakeli rankas).
- **Balsas ir garsai:** užduotys skaitomos balsu (naršyklės balsų sintezė), garsai sintezuojami.
- **Tėvams:** užrakinta 2 s palaikymu. Dienos žaidimo laiko riba, balso ir garsų jungikliai, progreso ištrynimas.
- **Telefonas ir TV:** susiejama QR kodu per vietinį serverį.

## Privatumas

Vaizdas apdorojamas tik telefone (MediaPipe naršyklėje). Į serverį ir televizorių keliauja tik judesio taškų koordinatės ir keli išraiškos skaičiai, ne vaizdas. Niekas neįrašoma. Progresas saugomas telefono naršyklėje. Nėra paskyrų, reklamų ir pirkimų.

## Paleidimas su televizoriumi

Reikia kompiuterio su [Node.js](https://nodejs.org) 18+ ir `openssl` (Mac ir Linux jį turi; Windows – per Git for Windows). Papildomų paketų nereikia.

```bash
node server.js
```

1. Kompiuteris, telefonas ir televizorius turi būti tame pačiame Wi-Fi.
2. Televizoriaus naršyklėje atidarykite adresą, kurį parodė serveris, pvz. `http://192.168.1.20:8080/tv`.
3. TV ekrane atsiras QR kodas. Nuskenuokite jį telefonu.
4. Telefonas įspės, kad sertifikatas nepatikimas (jis sugeneruotas jūsų kompiuteryje). Pasirinkite „Išsamiau“ → „Tęsti“. Tai būtina, nes telefono naršyklė kamerą leidžia tik per https.
5. TV ekrane paspauskite „Įjungti garsą“ (pulteliu), telefone – „Užduotys“.

Telefoną geriausia pastatyti stačiai 2–3 m atstumu, juosmens aukštyje, kad matytųsi visas vaikas.

## Paleidimas be serverio (tik telefonas)

Įkelkite `public` aplanką į bet kurį https statinių failų talpinimą (GitHub Pages, Netlify ir pan.) ir atidarykite telefone. Į televizorių vaizdą galima perduoti telefono ekrano dubliavimu (Smart View, Chromecast, AirPlay).

## Pirmo paleidimo metu reikia interneto

Judesių atpažinimo modeliai (~10 MB) įkeliami iš `cdn.jsdelivr.net` ir `storage.googleapis.com`, o QR kodo biblioteka TV puslapyje – iš `cdnjs.cloudflare.com`. Vėliau naršyklė juos laiko talpykloje.

## Failai

```
server.js            HTTP/HTTPS serveris ir WebSocket perdavimas be priklausomybių
public/index.html    telefono programa
public/tv.html       televizoriaus ekranas su QR kodu
public/js/app.js     kamera, atpažinimas, užduočių eiga, monetos, parduotuvė, tėvų nustatymai
public/js/tasks.js   10 užduočių ir judesių detektoriai
public/js/render.js  šuniuko, fonų ir konfeti piešimas
public/js/shared.js  garsai, balsas, ryšys, ekrano informacija
public/css/game.css  bendras stilius
```

## Žinomi apribojimai

- Lietuvišką balsą turi ne visi įrenginiai. Jei jo nėra, užduotį perskaitys kitas balsas, o tekstas vis tiek rodomas ekrane.
- Dviejų žaidėjų, šokių ir nuotykių režimai bei kiti personažai dar nesukurti (parduotuvėje pažymėti „Netrukus“).
- Senesnių televizorių naršyklės gali rodyti lėčiau. Tada geriau naudoti ekrano dubliavimą.

## Kitas žingsnis

Pridėti naują personažą reiškia parašyti naują piešimo funkciją `render.js` faile, o naują užduotį – pridėti įrašą į `MM.TASKS` masyvą `tasks.js` faile. Atpažinimas, monetos ir TV ryšys lieka tie patys.
