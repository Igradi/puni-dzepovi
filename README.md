# Puni Džepovi

Satirička top-down stealth igra u stilu Robbery Boba. Lopov s vrećom novca skuplja afere po levelu i bježi do auta, a istražitelji EUROLUPE ga love.

Igra je čisti HTML, CSS i JavaScript, bez biblioteka i bez build koraka.

## Pokretanje

Najjednostavnije: dvaput klikni `index.html` i otvori ga u pregledniku.

Ako želiš lokalni server (preporučeno dok razvijaš):

```bash
npx serve .
# ili
python3 -m http.server 8000
```

pa otvori `http://localhost:8000`.

## Struktura

```
index.html      kostur stranice, HUD, gumbi, overlay
css/style.css   izgled sučelja (HUD, kartice, gumbi)
js/levels.js    mape, afere, rute istražitelja za sva tri levela
js/game.js      logika igre, AI istražitelja, crtanje, kontrole
```

## Kontrole

- Klik ili dodir na tlocrt: lik ide tamo (pathfinding)
- Dvoklik: trči tamo (bučno, istražitelji čuju)
- Klik na ormar ili `E`: sakrij se / izađi
- `Q` ili gumb „Nemam komentara“: zamrzne istražitelje u blizini
- `WASD` / strelice: izravno kretanje, `Shift`: trk
- `P` ili `Esc`: pauza

## Kako dodati novi level

1. U `js/levels.js` kopiraj jedan objekt iz niza `LEVELS` i promijeni ga.
2. Mapa je niz stringova jednake duljine. Legenda znakova je na vrhu datoteke.
3. Stavi točno onoliko `A` polja koliko ima stavki u `afere` (višak uzima stavke ispočetka).
4. Rute istražitelja (`patrols`) su `[stupac, red]` točke. Moraju biti na prohodnom polju, istražitelj sam nađe put između njih.
5. `reinforce` je ruta istražitelja koji uđe nakon 4. afere.
6. Izlaz `C` stavi na desni rub mape: igra završava level kad igrač dođe u zadnji stupac sa svim aferama.

## Gdje je što u `game.js`

- `update()`: kretanje igrača, skupljanje afera, AI istražitelja (patrola, istraga zvuka, potjera)
- `canSee()`: vidno polje istražitelja (kut, domet, zidovi, gnojivo)
- `goTo()` i `bfs()`: klik-za-kretanje i pathfinding
- `drawChar()`: crtanje likova (lopov i istražitelji), tu mijenjaš izgled i natpis na majici
- `drawBlock()`: zidovi i namještaj u 3/4 pogledu, `TILT` i `HGT` mijenjaju nagib i visine
- `levelWin()`, `caught()`, `finale()`: ekrani pobjede, uhićenja i kraja

## Ideje za nastavak

- Novi leveli: ministarstvo, brodogradilište, Bruxelles kao boss level
- Glazba u pozadini i više zvučnih efekata
- Minimapa i ljestvica najboljih vremena
- Biranje kostima za lopova u izborniku

Napredak (otključani leveli, zvjezdice) sprema se u `localStorage` preglednika pod ključem `pd_save2`.
