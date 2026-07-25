/**
 * Kenya administrative locations: all 47 counties, their sub-counties
 * (constituencies) and the main towns / shopping centres under each.
 *
 * Stored in a compact DSL to keep the bundle small:
 *   County | SubCounty:town,town,town ; SubCounty:town,town
 * Buyers pick County -> Sub-County -> Town, then type their street/estate.
 */

const RAW: string[] = [
  "Mombasa|Changamwe:Changamwe,Port Reitz,Chaani,Airport,Miritini,Kipevu;Jomvu:Jomvu Kuu,Mikindani,Miritini,Magongo;Kisauni:Kisauni,Bamburi,Mwakirunge,Mjambere,Junda,Shanzu,Magogoni;Nyali:Nyali,Frere Town,Ziwa la Ng'ombe,Mkomani,Kongowea,Kadzandani,Links Road;Likoni:Likoni,Timbwani,Shika Adabu,Bofu,Mtongwe,Ujamaa;Mvita:Mvita,Mji wa Kale,Tudor,Tononoka,Shimanzi,Majengo,Ganjoni,Makadara",
  "Kwale|Msambweni:Msambweni,Gombato Bongwe,Ukunda,Kinondo,Ramisi;Lunga Lunga:Lunga Lunga,Vanga,Pongwe Kikoneni,Dzombo,Mwereni;Matuga:Matuga,Kubo South,Mkongani,Tsimba Golini,Waa,Tiwi,Diani;Kinango:Kinango,Ndavaya,Puma,Mackinnon Road,Chengoni,Mwavumbo,Samburu",
  "Kilifi|Kilifi North:Kilifi Town,Tezo,Sokoni,Mnarani,Watamu,Mtwapa;Kilifi South:Junju,Mtepeni,Shimo la Tewa,Chasimba,Mwarakaya;Kaloleni:Kaloleni,Mariakani,Mwanamwinga,Kayafungo;Rabai:Rabai,Mwawesa,Ruruma,Jibana;Ganze:Ganze,Bamba,Jaribuni,Sokoke;Malindi:Malindi,Shella,Ganda,Gongoni,Langobaya;Magarini:Magarini,Marafa,Adu,Garashi,Sabaki",
  "Tana River|Garsen:Garsen,Kipini,Witu,Kau;Galole:Hola,Wayu,Chewani,Mikinduni;Bura:Bura,Madogo,Bangale,Sala,Chewele",
  "Lamu|Lamu East:Faza,Kiunga,Basuba,Ndau;Lamu West:Lamu Town,Mpeketoni,Hindi,Mokowe,Witu,Bahari",
  "Taita Taveta|Taveta:Taveta,Mahoo,Chala,Mboghoni,Bomeni;Wundanyi:Wundanyi,Werugha,Wumingu,Mbale;Mwatate:Mwatate,Bura,Ronge,Chawia,Wusi;Voi:Voi,Mbololo,Sagalla,Kaloleni,Marungu,Mwakitau",
  "Garissa|Garissa Township:Garissa Town,Waberi,Galbet,Iftin,Bulla Iftin;Balambala:Balambala,Danyere,Jarajara,Saka;Lagdera:Modogashe,Benane,Goreale,Sabena;Dadaab:Dadaab,Dertu,Labasigale,Damajale,Liboi;Fafi:Bura East,Dekaharia,Jarajila,Nanighi;Ijara:Masalani,Ijara,Hulugho,Sangailu",
  "Wajir|Wajir North:Bute,Gurar,Batalu,Danaba;Wajir East:Wajir Town,Barwaqo,Khorof Harar,Wagberi;Tarbaj:Tarbaj,Elben,Sarman,Wargadud;Wajir West:Griftu,Hadado,Adamasajide,Ganyure;Eldas:Eldas,Della,Lakoley South,Elnur;Wajir South:Habaswein,Ibrahim Ure,Diif,Lagboghol",
  "Mandera|Mandera West:Takaba,Lagsure,Dandu,Gither;Banissa:Banissa,Derkhale,Guba,Malkamari;Mandera North:Rhamu,Ashabito,Guticha,Morothile;Mandera South:Elwak,Shimbir Fatuma,Wargudud,Kutulo;Mandera East:Mandera Town,Arabia,Libehia,Khalalio;Lafey:Lafey,Warankara,Waranqara,Alungu",
  "Marsabit|Moyale:Moyale Town,Butiye,Sololo,Uran,Obbu;North Horr:North Horr,Illeret,Dukana,Maikona,Turbi;Saku:Marsabit Town,Sagante,Karare,Jaldesa;Laisamis:Laisamis,Loiyangalani,Kargi,Korr,Logologo,Merille",
  "Isiolo|Isiolo North:Isiolo Town,Wabera,Bulla Pesa,Ngaremara,Burat,Oldonyiro;Isiolo South:Garbatulla,Kinna,Sericho,Modogashe",
  "Meru|Igembe South:Maua,Kiegoi,Athiru Gaiti,Akachiu;Igembe Central:Kangeta,Akirang'ondu,Athiru Ruujine,Kanuni;Igembe North:Laare,Antuambui,Naathu,Amwathi;Tigania West:Kianjai,Nkomo,Mbeu,Athwana;Tigania East:Muriri,Karama,Mikinduri,Kiguchwa;North Imenti:Ntima,Municipality,Nyaki West,Nyaki East;Buuri:Timau,Kibirichia,Kisima,Ruiri,Naari;Central Imenti:Nkuene,Abogeta,Kiagu,Igoji;South Imenti:Mitunguu,Nkuene,Abothuguchi,Igoji East;Tharaka:Marimanti,Gatunga",
  "Tharaka Nithi|Maara:Chogoria,Chuka Road,Mitheru,Muthambi,Ganga;Chuka Igambang'ombe:Chuka,Karingani,Magumoni,Mugwe,Igambang'ombe;Tharaka:Marimanti,Gatunga,Nkondi,Chiakariga,Kamanyaki",
  "Embu|Manyatta:Embu Town,Ruguru,Kithimu,Nginda,Gaturi;Runyenjes:Runyenjes,Kagaari,Kyeni,Karurumo;Mbeere South:Kiritiri,Mwea,Makima,Kiambere;Mbeere North:Siakago,Muminji,Ishiara,Evurore",
  "Kitui|Mwingi North:Kyuso,Mumoni,Tseikuru,Ngomeni;Mwingi West:Migwani,Kiomo,Nguni,Nuu;Mwingi Central:Mwingi Town,Kivou,Nguni,Waita;Kitui West:Mutonguni,Kauwi,Matinyani,Kwa Mutonga;Kitui Rural:Kisasi,Mbitini,Kwavonza,Kanyangi;Kitui Central:Kitui Town,Miambani,Township,Mulango;Kitui East:Mutito,Zombe,Endau,Voo,Nzambani;Kitui South:Mutomo,Ikutha,Kanziko,Athi,Ikanga",
  "Machakos|Masinga:Masinga,Kivaa,Ekalakala,Muthesya;Yatta:Kithimani,Ikombe,Katangi,Matuu;Kangundo:Kangundo Town,Tala,Kakuyuni,Kawethei;Matungulu:Tala,Matungulu,Kyeleni,Kivaani;Kathiani:Kathiani,Mitaboni,Upper Kaewa,Lower Kaewa;Mavoko:Athi River,Syokimau,Mlolongo,Kinanie,Muthwani;Machakos Town:Machakos Town,Mumbuni,Kola,Mutituni,Muvuti;Mwala:Mwala,Masii,Wamunyu,Mbiuni",
  "Makueni|Mbooni:Mbooni,Tulimani,Kithungo,Kalawa;Kilome:Kilome,Mukaa,Kasikeu,Salama;Kaiti:Wote Road,Kee,Ukia,Ilima,Kilungu;Makueni:Wote,Nzaui,Mbitini,Kathonzweni;Kibwezi West:Makindu,Kikumbulyu,Nguumo,Emali;Kibwezi East:Kibwezi,Mtito Andei,Thange,Ivingoni",
  "Nyandarua|Kinangop:Engineer,Njabini,Magumu,Githabai;Kipipiri:Kipipiri,Wanjohi,Geta,Miharati;Ol Kalou:Ol Kalou,Kaimbaga,Rurii,Karau;Ol Jorok:Weru,Charagita,Gathanji,Gatimu;Ndaragwa:Ndaragwa,Shamata,Kiriita,Leshau",
  "Nyeri|Tetu:Wamagana,Dedan Kimathi,Aguthi;Kieni:Naro Moru,Mweiga,Kabaru,Mwiyogo,Chaka;Mathira:Karatina,Iriaini,Konyu,Magutu,Ruguru;Othaya:Othaya,Karima,Iriaini,Chinga;Mukurweini:Mukurweini,Gikondi,Rugi,Thanu;Nyeri Town:Nyeri Town,Kamakwa,Ruring'u,Gatitu,Kiganjo",
  "Kirinyaga|Mwea:Wanguru,Kimbimbi,Mutithi,Kangai,Murinduko;Gichugu:Kianyaga,Baragwi,Njukiini,Karumandi;Ndia:Kagumo,Mukure,Kariti,Kiine;Kirinyaga Central:Kerugoya,Kanyekini,Mutira,Inoi",
  "Murang'a|Kangema:Kangema,Muguru,Rwathia;Mathioya:Kiriaini,Gitugi,Kamacharia;Kiharu:Murang'a Town,Mbiri,Township,Gaturi;Kigumo:Kigumo,Kahumbu,Muthithi,Kinyona;Maragwa:Maragua,Kimorori,Nginda,Ichagaki;Kandara:Kandara,Ng'araria,Ithiru,Gaichanjiru;Gatanga:Gatanga,Kariara,Ithanga,Mugumo-ini",
  "Kiambu|Gatundu South:Gatundu,Kiamwangi,Kiganjo,Ndarugu;Gatundu North:Gituamba,Githobokoni,Chania,Mang'u;Juja:Juja,Witeithie,Kalimoni,Theta,Murera;Thika Town:Thika,Township,Kamenu,Hospital,Gatuanyaga,Ngoliba;Ruiru:Ruiru,Kahawa Sukari,Kahawa Wendani,Githurai,Membley,Biashara;Githunguri:Githunguri,Githiga,Ikinu,Ngewa,Komothai;Kiambu:Kiambu Town,Township,Riabai,Ndumberi,Tinganga;Kiambaa:Karuri,Cianda,Ndenderu,Muchatha,Kihara;Kabete:Kabete,Gitaru,Uthiru,Kikuyu Road,Nyathuna;Kikuyu:Kikuyu,Karai,Nachu,Sigona,Kinoo;Limuru:Limuru,Ndeiya,Ngecha,Tigoni,Bibirioni;Lari:Lari,Kijabe,Nyanduma,Kamburu,Kinale",
  "Turkana|Turkana North:Lokitaung,Kaaleng,Kibish,Lapur,Nakalale;Turkana West:Kakuma,Lokichoggio,Kalobeyei,Letea,Oropoi;Turkana Central:Lodwar,Kanamkemer,Kerio,Kalokol,Kangatotha;Loima:Loima,Turkwel,Kotaruk,Lokiriama;Turkana South:Lokichar,Katilu,Kalapata,Lobokat;Turkana East:Lokori,Kochodin,Katilia",
  "West Pokot|Kapenguria:Kapenguria,Makutano,Mnagei,Siyoi,Riwo;Sigor:Sigor,Weiwei,Lomut,Sekerr,Masol;Kacheliba:Kacheliba,Suam,Kodich,Kasei,Kiwawa;Pokot South:Chepareria,Batei,Lelan,Tapach",
  "Samburu|Samburu West:Maralal,Lodokejek,Suguta Marmar,Poro,Loosuk;Samburu North:Baragoi,Nyiro,Ndoto,Nachola,South Horr;Samburu East:Wamba,Waso,Archers Post,Sereolipi",
  "Trans Nzoia|Kwanza:Kwanza,Kapomboi,Bikeke,Keiyo;Endebess:Endebess,Chepchoina,Matumbei;Saboti:Kitale West,Machewa,Kinyoro,Matisi,Tuwani;Kiminini:Kiminini,Waitaluk,Sirende,Hospital,Nabiswa;Cherangany:Cherangany,Sinyerere,Makutano,Motosiet,Sitatunga",
  "Uasin Gishu|Soy:Soy,Ziwa,Segero,Kipsomba,Kuinet;Turbo:Turbo,Huruma,Tapsagoi,Kamagut,Kiplombe;Moiben:Moiben,Tembelio,Sergoit,Karuna,Kimumu;Ainabkoi:Ainabkoi,Kapsoya,Kaptagat;Kapseret:Kapseret,Langas,Simat,Megun,Racecourse;Kesses:Kesses,Chepkoilel,Tulwet,Cheptiret,Tarakwa",
  "Elgeyo Marakwet|Marakwet East:Kapyego,Sambirir,Endo,Embobut;Marakwet West:Kapsowar,Lelan,Sengwer,Cherangany,Arror;Keiyo North:Iten,Emsoo,Tambach,Kamariny,Kapchemutwa;Keiyo South:Kaptarakwa,Chepkorio,Soy North,Soy South,Metkei",
  "Nandi|Tinderet:Songhor,Tindiret,Chemelil,Kapsimotwo;Aldai:Kobujoi,Kaptumo,Kemeloi,Terik;Nandi Hills:Nandi Hills,Chepkunyuk,Kapchorua,Ol'lessos;Emgwen:Kapsabet,Chepkumia,Kilibwoni,Kapkangani;Mosop:Kabiyet,Chepterwai,Kipkaren,Sangalo,Kurgung;Chesumei:Chemundu,Kosirai,Lelmokwo,Kaptel",
  "Baringo|Tiaty:Chemolingot,Ribkwo,Silale,Loiyamorock,Tangulbei;Baringo North:Kabartonjo,Barwessa,Saimo,Bartabwa;Baringo Central:Kabarnet,Sacho,Tenges,Ewalel,Kapropita;Baringo South:Marigat,Mochongoi,Mukutani,Ilchamus;Mogotio:Mogotio,Emining,Kisanana;Eldama Ravine:Eldama Ravine,Lembus,Mumberes,Koibatek,Perkerra",
  "Laikipia|Laikipia West:Rumuruti,Ol Moran,Githiga,Marmanet,Igwamiti;Laikipia East:Nanyuki,Ngobit,Tigithi,Thingithu,Umande;Laikipia North:Doldol,Mukogodo,Sosian,Segera",
  "Nakuru|Molo:Molo,Elburgon,Turi,Mariashoni;Njoro:Njoro,Mau Narok,Mauche,Kihingo,Lare;Naivasha:Naivasha Town,Karagita,Kayole,Hells Gate,Maiella,Olkaria,Longonot;Gilgil:Gilgil,Elementaita,Mbaruk,Malewa West,Murindati;Kuresoi South:Keringet,Kiptagich,Amalo,Tinet;Kuresoi North:Olenguruone,Kamara,Nyota,Sirikwa;Subukia:Subukia,Waseges,Kabazi;Rongai:Rongai,Solai,Visoi,Mosop,Menengai West;Bahati:Bahati,Dundori,Kabatini,Kiamaina,Lanet;Nakuru Town West:Barut,London,Kaptembwo,Kapkures,Rhoda,Shabab;Nakuru Town East:Biashara,Kivumbini,Flamingo,Menengai,Nakuru East",
  "Narok|Kilgoris:Kilgoris,Angata Barikoi,Shankoe,Kimintet,Lolgorian;Emurua Dikirr:Mogondo,Kapsasian,Ilkerin,Ololmasani;Narok North:Narok Town,Olpusimoru,Olokurto,Nkareta,Melili;Narok East:Suswa,Mosiro,Ildamat,Keekonyokie;Narok South:Ololulunga,Melelo,Loita,Sogoo,Sagamian;Narok West:Mara,Siana,Naikarra,Ilmotiok",
  "Kajiado|Kajiado North:Ongata Rongai,Ngong,Oloolua,Nkaimurunya,Olkeri;Kajiado Central:Kajiado Town,Purko,Ildamat,Dalalekutuk,Matapato;Kajiado East:Kitengela,Athi River East,Oloosirkon,Kaputiei North,Imaroro;Kajiado West:Kisamis,Magadi,Ewuaso Oo Nkidong'i,Mosiro,Keekonyokie;Kajiado South:Loitokitok,Entonet,Rombo,Kimana,Kuku",
  "Kericho|Kipkelion East:Kipkelion,Londiani,Kedowa,Chepseon,Tendeno;Kipkelion West:Kunyak,Kamasian,Chilchila,Kipkelion West;Ainamoi:Kericho Town,Ainamoi,Kapsoit,Kapkugerwet,Kipchebor;Bureti:Litein,Cheborge,Kisiara,Tebesonik,Chemosot;Belgut:Sosiot,Waldai,Kabianga,Cheptororiet,Seretut;Sigowet Soin:Sigowet,Kaplelartet,Soliat,Soin",
  "Bomet|Sotik:Sotik Town,Ndanai,Chemagel,Kipsonoi,Rongena;Chepalungu:Sigor,Kongasis,Nyangores,Siongiroi;Bomet East:Longisa,Merigi,Kembu,Chemaner,Kipreres;Bomet Central:Bomet Town,Silibwet,Mutarakwa,Singorwet,Ndaraweta;Konoin:Mogogosiek,Kimulot,Boito,Chepchabas,Embomos",
  "Kakamega|Lugari:Lugari,Lumakanda,Chekalini,Chevaywa,Mautuma;Likuyani:Likuyani,Sango,Kongoni,Nzoia,Sinoko;Malava:Malava,West Kabras,Chemuche,Butali,Manda;Lurambi:Kakamega Town,Shieywe,Mahiakalo,Butsotso,Shirere;Navakholo:Navakholo,Ingostse,Shinoyi,Bunyala West;Mumias West:Mumias,Mumias Central,Etenje,Musanda;Mumias East:Lusheya,Malaha,East Wanga,Isongo;Matungu:Matungu,Khalaba,Mayoni,Kholera,Namamali;Butere:Butere,Marama West,Marama Central,Marenyo;Khwisero:Khwisero,Kisa East,Kisa West,Kisa Central;Shinyalu:Shinyalu,Isukha,Murhanda,Khayega;Ikolomani:Ikolomani,Idakho South,Idakho East,Shibuye",
  "Vihiga|Vihiga:Mbale,Lugaga,Wamuluma,Chango,Central Maragoli;Sabatia:Chavakali,Busali,Wodanga,Izava,North Maragoli;Hamisi:Hamisi,Shiru,Gisambai,Muhudu,Tambua;Luanda:Luanda,Emabungo,Wemilabi,Mwibona;Emuhaya:Emuhaya,Ebusiratsi,Ebusakami,North Bunyore",
  "Bungoma|Mt Elgon:Kapsokwony,Cheptais,Chesikaki,Kaptama,Elgon;Sirisia:Sirisia,Namwela,Malakisi,Lwandanyi;Kabuchai:Kabuchai,Chwele,West Nalondo,Bwake;Bumula:Bumula,Khasoko,Kabula,Kimaeti,South Bukusu;Kanduyi:Bungoma Town,Bukembe,Township,Musikoma,Khalaba;Webuye East:Webuye,Mihuu,Ndivisi,Maraka;Webuye West:Misikhu,Sitikho,Matulo,Bokoli;Kimilili:Kimilili,Kibingei,Maeni,Kamukuywa;Tongaren:Tongaren,Naitiri,Ndalu,Milima,Soysambu",
  "Busia|Teso North:Malaba,Angurai,Ang'orom,Chakol;Teso South:Amukura,Ang'urai South,Chakol South,Amerikwai;Nambale:Nambale,Bukhayo North,Bukhayo West,Nambale Township;Matayos:Matayos,Busibwabo,Burumba,Mayenje;Butula:Butula,Marachi West,Marachi East,Elugulu;Funyula:Funyula,Namboboto,Ageng'a,Bwiri;Budalangi:Budalangi,Bunyala Central,Bunyala North,Port Victoria",
  "Siaya|Ugenya:Ukwala,Sidindi,Sigomere,West Ugenya;Ugunja:Ugunja,Sidindi,Sigomere;Alego Usonga:Siaya Town,Usonga,West Alego,Central Alego,Nyawita;Gem:Yala,Wagai,North Gem,East Gem,Nyangoma;Bondo:Bondo,Usigu,Nyang'oma,Maranda,Ajigo;Rarieda:Madiany,Rarieda,East Asembo,West Uyoma,Nyang'oma Kogelo",
  "Kisumu|Kisumu East:Kisumu East,Kolwa,Manyatta B,Nyalenda A,Kajulu;Kisumu West:Kisumu West,Central Kisumu,North West Kisumu,Ojolla,Otonglo;Kisumu Central:Kisumu City,Milimani,Market Milimani,Railways,Kondele,Nyalenda B;Seme:Kombewa,East Seme,West Seme,North Seme;Nyando:Awasi,Ahero,Kobura,Kabonyo,Onjiko;Muhoroni:Muhoroni,Chemelil,Miwani,Ombeyi,Koru;Nyakach:Katito,South West Nyakach,Central Nyakach,Pap Onditi",
  "Homa Bay|Kasipul:Oyugis,West Kasipul,Central Kasipul,East Kamagak;Kabondo Kasipul:Kabondo,Kokwanyo,Kojwach,Kabondo East;Karachuonyo:Kendu Bay,North Karachuonyo,Central Karachuonyo,Wangchieng,Kanyaluo;Rangwe:Rangwe,East Gem,Kagan,Kochia;Homa Bay Town:Homa Bay,Arujo,Township,Kanyadoto;Ndhiwa:Ndhiwa,Kwabwai,Kanyamwa,Kanyikela;Suba North:Mbita,Rusinga,Kasgunga,Gembe,Lambwe;Suba South:Sindo,Kaksingri,Ruma Kaksingri,Gwassi",
  "Migori|Rongo:Rongo,North Kamagambo,South Kamagambo,Central Kamagambo;Awendo:Awendo,North Sakwa,South Sakwa,West Sakwa;Suna East:Migori Town,God Jope,Suna Central,Wiga;Suna West:Wiga,Wasweta,Ragana,Kakrao;Uriri:Uriri,West Kanyamkago,North Kanyamkago,Central Kanyamkago;Nyatike:Macalder,Kachieng,Kanyasa,Muhuru,Karungu;Kuria West:Kehancha,Bukira,Isibania,Nyamosense,Ntimaru;Kuria East:Ntimaru,Nyabasi East,Nyabasi West,Gokeharaka",
  "Kisii|Bonchari:Suneka,Bomariba,Riana,Bogiakumu;South Mugirango:Nyamarambe,Tabaka,Bogetenga,Borabu;Bomachoge Borabu:Kenyenya,Boochi,Bombaba,Magenche;Bobasi:Ogembo,Masige,Sameta,Nyacheki,Bobasi Central;Bomachoge Chache:Majoge,Boochi,Bosoti;Nyaribari Masaba:Keumbu,Ichuni,Gesusu,Masimba;Nyaribari Chache:Kisii Town,Bobaracho,Kiogoro,Birongo,Ibeno;Kitutu Chache North:Marani,Monyerero,Sensi,Kegogi;Kitutu Chache South:Nyakoe,Bogusero,Bogeka,Nyatieko",
  "Nyamira|Kitutu Masaba:Rigoma,Gachuba,Kemera,Magombo;West Mugirango:Nyansiongo,Bonyamatuta,Township,Bogichora;North Mugirango:Ekerenyo,Itibo,Bomwagamo,Magwagwa;Borabu:Nyansiongo,Esise,Kiabonyoru,Mekenene",
  "Nairobi|Westlands:Westlands,Parklands,Highridge,Kangemi,Mountain View,Kitisuru,Karura;Dagoretti North:Kilimani,Kawangware,Gatina,Kileleshwa,Kabiro;Dagoretti South:Mutu-ini,Ngando,Riruta,Uthiru,Waithaka;Langata:Karen,Nairobi West,Mugumo-ini,South C,Nyayo Highrise;Kibra:Kibera,Laini Saba,Lindi,Makina,Woodley,Sarangombe;Roysambu:Roysambu,Garden Estate,Githurai,Kahawa West,Zimmerman,Kahawa;Kasarani:Kasarani,Clay City,Mwiki,Njiru,Ruai;Ruaraka:Baba Dogo,Utalii,Mathare North,Lucky Summer,Korogocho;Embakasi South:Imara Daima,Kwa Njenga,Kwa Reuben,Pipeline,Kware;Embakasi North:Kariobangi North,Dandora Area I,Dandora Area II,Dandora Area III;Embakasi Central:Kayole North,Kayole Central,Kayole South,Komarock,Matopeni;Embakasi East:Upper Savannah,Lower Savannah,Embakasi,Utawala,Mihango;Embakasi West:Umoja I,Umoja II,Mowlem,Kariobangi South;Makadara:Maringo,Hamza,Viwandani,Harambee,Makongeni;Kamukunji:Pumwani,Eastleigh North,Eastleigh South,Airbase,California;Starehe:Nairobi Central,Ngara,Pangani,Ziwani,Landimawe,Nairobi South;Mathare:Hospital,Mabatini,Huruma,Ngei,Mlango Kubwa,Kiamaiko",
];

export interface KenyaSubCounty {
  name: string;
  towns: string[];
}
export interface KenyaCounty {
  name: string;
  subCounties: KenyaSubCounty[];
}

export const KENYA_COUNTIES: KenyaCounty[] = RAW.map((row) => {
  const [county, rest] = row.split("|");
  return {
    name: county,
    subCounties: (rest ?? "")
      .split(";")
      .filter(Boolean)
      .map((sc) => {
        const [name, towns] = sc.split(":");
        return { name, towns: (towns ?? "").split(",").filter(Boolean) };
      }),
  };
}).sort((a, b) => a.name.localeCompare(b.name));

export const COUNTY_NAMES = KENYA_COUNTIES.map((c) => c.name);

export function getSubCounties(county: string): KenyaSubCounty[] {
  return KENYA_COUNTIES.find((c) => c.name === county)?.subCounties ?? [];
}

export function getTowns(county: string, subCounty: string): string[] {
  return getSubCounties(county).find((s) => s.name === subCounty)?.towns ?? [];
}
