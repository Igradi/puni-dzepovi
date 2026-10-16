// Leveli igre "Puni Džepovi".
// Legenda mape (svaki znak = jedno polje 32x32):
//   #  zid            .  drveni pod       ,  pločice        :  tepih        ;  trava
//   W  saborska fotelja (skrivanje iza nje)  G  hrpa gnojiva / otpada (skriva, usporava)
//   T  stol   B  krevet   K  kauč   F  kuhinja   H  bolnički krevet   X  bala sijena   D  bačva otpada
//   _  betonski pod
//   A  afera (redom uzima stavke iz "afere")   S  PPD oltarić (+1 izjava)
//   P  početna pozicija igrača                 C  izlaz / auto (otvara se kad su sve afere pokupljene)
// patrols: lista ruta istražitelja, svaka ruta je niz [stupac, red] točaka.
// reinforce: ruta istražitelja koji ulazi nakon 4. pokupljene afere.
// vis: domet pogleda u pikselima, par: vrijeme (s) za treću zvjezdicu.
// pile: 'otpad' crta G polja kao hrpe otpada umjesto gnojiva.
const LEVELS = [
{
  name:'Otpad u Lici', kicker:'Level 1', par:110, vis:160, patrolSp:50, pile:'otpad',
  tip:'Bivši PPK Velebit, Gospić. Hrpe otpada te skrivaju, ali usporavaju. Kad zagusti, sakrij se iza saborske fotelje.',
  map:[
"##############################",
"#;;;;;;;;;;;;;#______________#",
"#;GG;;;;;;GG;;#_DD__DD__DD_A_#",
"#;GG;;A;;;GG;;#_DD__DD__DD___#",
"#;;;;;;;;;;;;;#__________W___#",
"#;;;;;GG;;;;;;_____A_________#",
"#;A;;;GG;;;;;;#______________#",
"#;;;;;;;;;;;;;###_#####_######",
"#;;;;;;;;;;;;;;;;;;;;;;;;;;;;#",
"#;;GG;;;;;;;;;;;;;GG;;;;;S;;;#",
"#;;GG;;;DDDD;;;;A;GG;;;;;;;;;#",
"#;;;;;;;DDDD;;;;;;;;;;;;;;;;;#",
"####;########;;;;#####;#######",
"#,,,,,,,,,,,#;;;;#:::::::A:::#",
"#,,A,,W,,TT,#;;GG#::W::::::::C",
"#,,,,,,,,TT,;;;;;#:::::P:::::C",
"#,,,,,,,,,,,#;;;;#::KK:::::::#",
"##############################"],
  patrols:[[[3,8],[27,8],[23,5],[16,5],[16,1],[27,1]], [[2,13],[10,16],[13,15],[15,10],[2,10]]],
  reinforce:[[27,16],[19,13],[27,13]],
  afere:[
    {ico:'🗑️', name:'33.000 tona ispod zemlje', val:330000, txt:'Vještaci su na PPK Velebit našli 37.000 tona otpada. Gotovo 33.000 zakopano.'},
    {ico:'♻️', name:'„Plastika za recikliranje“', val:200000, txt:'Na papiru reciklaža. U zemlji miješani i medicinski otpad, sumnja USKOK.'},
    {ico:'🚛', name:'Kamioni svaki dan', val:120000, txt:'Vozačima rečeno da ne spavaju pred firmom jer ljudi pitaju kuda se toliko kamena prodaje.'},
    {ico:'🌍', name:'Uvoz iz Italije i Slovenije', val:150000, txt:'Otpad je prešao granicu bez problema. Odgovornost još čeka na carini.'},
    {ico:'📞', name:'„Osam komada riješeno ujutro“', val:80000, txt:'Iz iskaza svjedoka. Vozač je, kaže, govorio da je to kriminal.'},
    {ico:'🕵️', name:'Inspektor pod istragom', val:50000, txt:'Bivši glavni državni inspektor uhićen zbog sumnje na korupciju, neslužbeno. Tko inspektira inspektore?'},
    {ico:'🧻', name:'Prekrit ćemo do sredine listopada', val:1, txt:'Tako je najavljeno za odlagalište. Što se ne vidi, nije afera.'}]
},
{
  name:'Vikendica na pašnjaku', kicker:'Level 2', par:100, vis:158, patrolSp:50,
  tip:'Kuća se 11 godina vodila kao pašnjak. Klikni na tlocrt, pokupi 7 afera i bježi do auta. Kad zagusti, sjedni u saborsku fotelju.',
  map:[
"##############################",
"#:::::::::#,,,,,,,#..........#",
"#:BB::::::#,FFFF,,#..KKKK....#",
"#:BB::A:::#,,,,,,,#..........#",
"#:::::::W:#,,,A,,,#....TT..A.#",
"#:::::::::,,,,,,,,,....TT....#",
"#####.########.#########.#####",
"#..A......................W..#",
"#............................#",
"###.##########.#######.#######",
"#:::::::::#,,,,,,,#..........#",
"#:TT::::W:#,,,A,,,#...S......#",
"#:TT::::::#,,,,,,,#.....A....#",
"#:::::::::,,,,,,,,#..........C",
"#:::::::::#,,W,,,,#....P.....C",
"#::::A::::#,,,,,,,#..........#",
"#:::::::::#,,,,,,,#..KK......#",
"##############################"],
  patrols:[[[27,3],[14,3],[5,2],[3,8],[26,8]], [[5,12],[14,12],[22,8],[14,8]]],
  reinforce:[[27,13],[20,11],[20,16],[27,15]],
  afere:[
    {ico:'🐄', name:'Kuća upisana kao pašnjak', val:250000, txt:'Jedanaest godina nije je bilo u katastru. Krave nisu prigovarale.'},
    {ico:'💼', name:'Crni fond Fimi medije', val:9300000, txt:'Stranka pravomoćno kažnjena s 3,5 milijuna kuna. Sitniš.'},
    {ico:'🛢️', name:'INA-MOL', val:10000000, txt:'Pravomoćno: 10 milijuna eura mita za upravljanje INA-om.'},
    {ico:'💻', name:'Softver za 1,3 milijuna', val:1300000, txt:'Nagodba: dvije godine zatvora. Program se još instalira.'},
    {ico:'🍽️', name:'Ručak na račun EU', val:10000, txt:'Sedam mjeseci zatvora. Desert je ipak bio skup.'},
    {ico:'📜', name:'Potpore „po babi i po stričevima“', val:500000, txt:'Tako se zove optužnica. Optuženi sve niječu.'},
    {ico:'🏃', name:'Bijeg prije skidanja imuniteta', val:1, txt:'Granica pređena par sati prije glasanja u Saboru. Austrija ga je ipak vratila.'}]
},
{
  name:'Afera Mikroskopi', kicker:'Level 3', par:140, vis:168, patrolSp:54,
  tip:'Tri istražitelja obilaze odjele. Saborske fotelje su u laboratoriju, uredu i sobama. Dvoklik = trk, ali čuju te.',
  map:[
"##############################",
"#,,,,,,,,#,,,,,,,,#::::::::::#",
"#,FF,,FF,#,,A,,,,,#::TT:::A::#",
"#,,,A,,,,#,,,,,X,,#::TT::::::#",
"#,,,,,,,,#,,,,,,,W#::::::::W:#",
"#,,,,A,,,,,,,,,,,,#::::::::::#",
"####.#########.#########.#####",
"#.....W...........S..........#",
"#............................#",
"######.#######.########.######",
"#,,,,,,,,,#,,,,,,,#,,,,,,,,,,#",
"#,HH,,HH,,#,HH,,HH#,HH,,HH,,,#",
"#,,,,,,,,,#,,,,,,,#,,,,,A,,,,#",
"#,,A,,,,,W#,,,,,,W#,,,,,,,,,,#",
"#,HH,,HH,,#,HH,A,,#,HH,,HH,,,#",
"#,,,,,,,,,,,,,,,,,,,,,,,,,,P,C",
"#,,,,,,,,,#,,,,,,,#,,,,,,,,,,C",
"##############################"],
  patrols:[[[2,8],[27,8],[24,3],[14,3]], [[6,3],[7,1],[6,8],[14,8]], [[5,12],[14,12],[24,13],[14,16]]],
  reinforce:[[27,16],[22,12],[27,10]],
  afere:[
    {ico:'🔬', name:'Operacijski mikroskop', val:740000, txt:'Proračun oštećen za više od 740.000 €, tvrdi optužnica. Okrivljeni niječu.'},
    {ico:'✉️', name:'Kuverta od 75.000 €', val:75000, txt:'Toliko je mita, prema optužnici. Bivši ministar kaže da nije.'},
    {ico:'🤝', name:'Nagodba suokrivljenika', val:100000, txt:'Deset mjeseci, zamijenjeno radom za opće dobro, plus 100.000 € kazne.'},
    {ico:'⚖️', name:'Spor oko nadležnosti', val:1, txt:'Europski tužitelji ili domaći? Glavni državni odvjetnik zna odgovor.'},
    {ico:'🏃', name:'Odbjegli suokrivljenik', val:50000, txt:'Pobjegao, pa se predao. Tko bi rekao.'},
    {ico:'📋', name:'Lista čekanja', val:20000, txt:'Prijatelji su odjednom na vrhu.'},
    {ico:'📅', name:'Optužnica na čekanju', val:1, txt:'Godinu i pol kasnije još nije potvrđena. Strpljenje je vrlina.'}]
},
{
  name:'Agencija za poticaje', kicker:'Level 4', par:150, vis:182, patrolSp:56,
  tip:'Hrpe gnojiva te skrivaju od pogleda, ali usporavaju. Ne ulazi u njih pred istražiteljem.',
  map:[
"##############################",
"#;;;;;;;;;;;;#,,,,,,,,,,,,,,,#",
"#;GG;;;;;GG;;#,TT,,TT,,TT,A,,#",
"#;GG;;A;;GG;;#,TT,,TT,,TT,,,,#",
"#;;;;;;;;;;;;#,,,,,,,,,,,,,W,#",
"#;;;;XX;;;;;;,,,,,A,,,,,,,,,,#",
"#;A;;XX;;;GG;#,,,,,,,,,,,,,,,#",
"#;;;;;;;;;GG;#####,###########",
"#;;;;;;;;;;;;;;;;;;;;;;;;;;;;#",
"#;;GG;;;;;;;;;;;;;;GG;;;;;S;;#",
"#;;GG;;;XXXX;;;;A;;GG;;;;;;;;#",
"#;;;;;;;XXXX;;;;;;;;;;;;;;;;;#",
"####;########;;;;#####;#######",
"#...........#;;;;#,,,,,,,A,,,#",
"#..A..W.....#;;GG#,,W,,,,,,,,C",
"#...........;;;;;#,,,,P,,,,,,C",
"#...........#;;;;#,,KK,,,,,,,#",
"##############################"],
  patrols:[[[15,1],[27,6],[15,6],[17,3]], [[2,8],[27,8],[27,11],[6,11]], [[2,13],[10,16],[10,13],[14,13]]],
  reinforce:[[27,16],[19,13],[27,13]],
  afere:[
    {ico:'🗺️', name:'Napuhani katastar', val:357000, txt:'Zemlja u registru rasla je brže od kukuruza. Isplaćeno 357.000 €, tvrdi EPPO.'},
    {ico:'📝', name:'Krivotvorena njiva', val:100000, txt:'Papiri kažu da se zemlja obrađuje. Zemlja o tome ništa ne zna.'},
    {ico:'🚔', name:'21 uhićenje u jednom danu', val:1, txt:'150 policajaca, 30 pretraga. Krave su svjedoci.'},
    {ico:'🛢️', name:'JANAF i „institut blagoslova“', val:250000, txt:'Ugovori su išli uz blagoslov. Mito od 1,9 milijuna kuna, sumnja USKOK.'},
    {ico:'🌬️', name:'Afera Vjetroelektrane', val:200000, txt:'Od 27 okrivljenih, 11 se nagodilo. Vjetar okreće.'},
    {ico:'💩', name:'Faktura za gnojivo', val:36000, txt:'Na papiru ga ima više nego na njivi.'},
    {ico:'🐄', name:'Poticaj za nepostojeću kravu', val:12000, txt:'Krava je na godišnjem.'}]
}];
