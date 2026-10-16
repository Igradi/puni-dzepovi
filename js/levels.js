// Leveli igre "Puni Džepovi".
// Legenda mape (svaki znak = jedno polje 32x32):
//   #  zid            .  drveni pod       ,  pločice        :  tepih        ;  trava
//   W  ormar (skrivanje)                  G  hrpa gnojiva (skriva, usporava)
//   T  stol   B  krevet   K  kauč   F  kuhinja   H  bolnički krevet   X  bala sijena
//   A  afera (redom uzima stavke iz "afere")   S  PPD oltarić (+1 izjava)
//   P  početna pozicija igrača                 C  izlaz / auto (otvara se kad su sve afere pokupljene)
// patrols: lista ruta istražitelja, svaka ruta je niz [stupac, red] točaka.
// reinforce: ruta istražitelja koji ulazi nakon 4. pokupljene afere.
// vis: domet pogleda u pikselima, par: vrijeme (s) za treću zvjezdicu.
const LEVELS = [
{
  name:'Stan', kicker:'Level 1', par:100, vis:158, patrolSp:50,
  tip:'Klikni bilo gdje na tlocrt i Lojtrić ide tamo. Pokupi 7 afera pa bježi do auta u garaži.',
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
    {ico:'🔬', name:'Zlatni mikroskop', val:480000, txt:'Isti kao u bolnici, samo četiri puta skuplji.'},
    {ico:'✉️', name:'Kuverta „za kavu“', val:75000, txt:'Kava je stvarno poskupjela.'},
    {ico:'💩', name:'Faktura za gnojivo', val:36000, txt:'Na papiru ga ima više nego na njivi.'},
    {ico:'🧸', name:'Fantomski vrtić', val:211300, txt:'Djece nema, EU potpora ima.'},
    {ico:'📱', name:'SMS „šef će odobriti“', val:50000, txt:'Pobriši prije nego netko pita tko je šef.'},
    {ico:'📋', name:'Natječaj s jednim ponuđačem', val:150000, txt:'Konkurencija je bila jaka: nitko se nije javio.'},
    {ico:'🏠', name:'Imovinska kartica', val:1, txt:'Sve je naslijeđeno od tete iz Kanade.'}]
},
{
  name:'Bolnica', kicker:'Level 2', par:140, vis:168, patrolSp:54,
  tip:'Tri istražitelja obilaze odjele. Ormari su u laboratoriju, uredu i sobama. Dvoklik = trk, ali čuju te.',
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
    {ico:'🔬', name:'Operacijski mikroskop', val:480000, txt:'Plaćen kao da vidi u budućnost.'},
    {ico:'🤖', name:'Kirurški robot', val:450000, txt:'Robot je jeftin. Ugovor oko njega nije.'},
    {ico:'✉️', name:'Kuverta u bijeloj kuti', val:75000, txt:'Liječnička tajna.'},
    {ico:'📋', name:'Lista čekanja', val:20000, txt:'Prijatelji su odjednom na vrhu.'},
    {ico:'📝', name:'Nabava bez natječaja', val:300000, txt:'Hitan slučaj. Već treću godinu.'},
    {ico:'💼', name:'Račun za „konzultacije“', val:60000, txt:'Konzultirao se sam sa sobom.'},
    {ico:'📱', name:'Poruka „ravnatelj će potpisati“', val:40000, txt:'Ravnatelj je potpisao. Naravno.'}]
},
{
  name:'Agencija za poticaje', kicker:'Level 3', par:150, vis:182, patrolSp:56,
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
    {ico:'💩', name:'Faktura za gnojivo', val:36000, txt:'Na papiru ga ima više nego na njivi.'},
    {ico:'🐄', name:'Poticaj za nepostojeću kravu', val:12000, txt:'Krava je na godišnjem.'},
    {ico:'🗺️', name:'Lažni katastar', val:90000, txt:'Livada se protegnula do mora.'},
    {ico:'✉️', name:'Kuverta iz podružnice', val:36000, txt:'Za brže rješavanje predmeta.'},
    {ico:'🚜', name:'Traktor na firmu', val:80000, txt:'Vozi ga šogor, a vodi se na OPG.'},
    {ico:'🐑', name:'Potpora za ovce bjegunce', val:24000, txt:'Ovce su pobjegle. Novac nije.'},
    {ico:'🏡', name:'Ruralni razvoj vikendice', val:150000, txt:'Bazen je ruralni, tvrdi projekt.'}]
}];
