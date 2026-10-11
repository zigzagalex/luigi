#!/usr/bin/env bash
set -euo pipefail

CONTAINER="${POSTGRES_CONTAINER:-luigi-postgres-dev}"

echo "==> Seeding product_translations inside container '${CONTAINER}'"

# This SQL:
# - maps products by SKU from the existing seeded catalog
# - upserts translations for multiple locales
# - keeps detailed_description in markdown for rich rendering (lists, bold, italic, etc.)
SQL=$(cat <<'EOSQL'
WITH src AS (
  SELECT
    p.id AS product_id,
    t.locale,
    t.name,
    t.description,
    t.detailed_description
  FROM products p
  JOIN (
    VALUES
      -- STD-MTB-TRAIL-1
      ('STD-MTB-TRAIL-1', 'en', 'Standard MTB Trail 1', 'Hardtail mountain bike for light trail riding.', $$### Trail-ready hardtail
The **Standard MTB Trail 1** is built for riders who want confidence and comfort on mixed terrain.

- Lightweight aluminum frame
- Front suspension for roots and gravel
- Stable geometry for beginner-friendly handling
- Reliable 1x drivetrain with wide gear range
- Hydraulic disc brakes for secure stopping

_Best for_: weekend trail rides and daily fitness sessions.$$),
      ('STD-MTB-TRAIL-1', 'de', 'Standard MTB Trail 1', 'Hardtail-Mountainbike für leichte Trail-Touren.', $$### Trail-Hardtail für Einsteiger
Das **Standard MTB Trail 1** bietet Sicherheit und Komfort auf wechselndem Untergrund.

- Leichter Aluminiumrahmen
- Federgabel für Wurzeln und Schotter
- Stabile Geometrie mit gutem Handling
- Zuverlässiger 1x-Antrieb mit grossem Übersetzungsbereich
- Hydraulische Scheibenbremsen

_Ideal für_: Wochenend-Trails und regelmässiges Training.$$),
      ('STD-MTB-TRAIL-1', 'fr', 'Standard MTB Trail 1', 'VTT semi-rigide pour sentiers faciles.', $$### Semi-rigide polyvalent
Le **Standard MTB Trail 1** offre un excellent equilibre entre confort et controle.

- Cadre aluminium leger
- Suspension avant pour chemins irreguliers
- Geometrie stable et rassurante
- Transmission 1x avec large plage de vitesses
- Freins a disque hydrauliques

_Parfait pour_: sorties nature et remise en forme.$$),
      ('STD-MTB-TRAIL-1', 'it', 'Standard MTB Trail 1', 'Mountain bike hardtail per trail leggeri.', $$### Hardtail pronta per i trail
La **Standard MTB Trail 1** e pensata per controllo, comfort e facilita di guida.

- Telaio in alluminio leggero
- Sospensione anteriore per sterrato e ghiaia
- Geometria stabile per maggiore sicurezza
- Trasmissione 1x con rapporti ampi
- Freni a disco idraulici

_Ideale per_: uscite nel weekend e allenamenti regolari.$$),
      ('STD-MTB-TRAIL-1', 'es', 'Standard MTB Trail 1', 'Bicicleta MTB rigida para rutas de trail ligeras.', $$### Hardtail para empezar en trail
La **Standard MTB Trail 1** combina control, comodidad y mantenimiento sencillo.

- Cuadro de aluminio ligero
- Suspension delantera para terrenos irregulares
- Geometria estable y predecible
- Transmision 1x de amplio rango
- Frenos de disco hidraulicos

_Ideal para_: rutas recreativas y entrenamiento semanal.$$),

      -- STD-MTB-TRAIL-2
      ('STD-MTB-TRAIL-2', 'en', 'Standard MTB Trail 2', 'Entry-level full-suspension MTB for weekend rides.', $$### Comfortable full suspension
The **Standard MTB Trail 2** gives extra grip and comfort on rougher sections.

- Full-suspension setup for improved control
- Balanced frame for climbing and descending
- Modern cockpit for confidence on technical parts
- Durable wheelset for repeated trail use
- Disc brakes with consistent modulation

_Best for_: riders moving from city paths to rougher trails.$$),
      ('STD-MTB-TRAIL-2', 'de', 'Standard MTB Trail 2', 'Einsteiger-Fully für Wochenendtouren auf Trails.', $$### Komfortables Einsteiger-Fully
Das **Standard MTB Trail 2** bietet mehr Traktion und Komfort auf unebenem Terrain.

- Vollfederung für bessere Kontrolle
- Ausgewogene Rahmengeometrie für Anstieg und Abfahrt
- Modernes Cockpit für sicheres Fahrgefühl
- Robuster Laufradsatz für häufige Trails
- Scheibenbremsen mit gut dosierbarer Bremskraft

_Ideal für_: den Umstieg von Radwegen auf echte Trails.$$),
      ('STD-MTB-TRAIL-2', 'fr', 'Standard MTB Trail 2', 'VTT tout-suspendu debutant pour sorties du week-end.', $$### Tout-suspendu accessible
Le **Standard MTB Trail 2** apporte plus d'adherence et de confort sur terrain casse.

- Suspension integrale pour plus de controle
- Cadre equilibre en montee et en descente
- Poste de pilotage moderne et rassurant
- Roues robustes pour usage regulier
- Freinage a disque progressif

_Parfait pour_: progresser vers des sentiers plus techniques.$$),
      ('STD-MTB-TRAIL-2', 'it', 'Standard MTB Trail 2', 'MTB full suspension entry-level per uscite del weekend.', $$### Full suspension confortevole
La **Standard MTB Trail 2** migliora aderenza e comfort sui percorsi sconnessi.

- Sospensione completa per maggiore controllo
- Telaio bilanciato in salita e discesa
- Cockpit moderno per guida sicura
- Ruote resistenti per uso frequente
- Frenata a disco modulabile

_Ideale per_: chi vuole affrontare trail piu impegnativi.$$),
      ('STD-MTB-TRAIL-2', 'es', 'Standard MTB Trail 2', 'MTB de doble suspension de entrada para salidas de fin de semana.', $$### Doble suspension para mas control
La **Standard MTB Trail 2** ofrece traccion adicional y mayor comodidad en zonas rotas.

- Doble suspension para mejor absorcion
- Cuadro equilibrado para subir y bajar
- Cockpit moderno y estable
- Ruedas resistentes para uso continuo
- Frenos de disco con buena modulacion

_Ideal para_: progresar hacia senderos mas tecnicos.$$),

      -- STD-RD-END-1
      ('STD-RD-END-1', 'en', 'Standard Road Endurance 1', 'Endurance road bike for relaxed long-distance rides.', $$### Endurance road comfort
The **Standard Road Endurance 1** focuses on all-day comfort without losing efficiency.

- Endurance geometry to reduce back and neck strain
- Stable wheelbase for predictable handling
- Vibration-damping frame design
- Smooth shifting drivetrain for long rides
- Disc brakes for all-weather control

_Best for_: long weekend rides and sportive preparation.$$),
      ('STD-RD-END-1', 'de', 'Standard Road Endurance 1', 'Endurance-Rennrad für entspannte lange Strecken.', $$### Komfort für lange Distanzen
Das **Standard Road Endurance 1** verbindet Ausdauerkomfort mit effizientem Vortrieb.

- Endurance-Geometrie zur Entlastung von Ruecken und Nacken
- Ruhiger Geradeauslauf dank stabilem Radstand
- Rahmen mit guter Vibrationsdaempfung
- Präziser Antrieb für lange Etappen
- Scheibenbremsen für jede Wetterlage

_Ideal für_: lange Touren und Jedermann-Rennen.$$),
      ('STD-RD-END-1', 'fr', 'Standard Road Endurance 1', 'Velo de route endurance pour longues sorties confortables.', $$### Route endurance au long cours
Le **Standard Road Endurance 1** privilegie le confort sur plusieurs heures de selle.

- Geometrie endurance moins fatigante
- Empattement stable et direction previsible
- Conception du cadre qui filtre les vibrations
- Transmission fluide pour rouler longtemps
- Freins a disque performants sous la pluie

_Parfait pour_: cyclosportives et longues distances.$$),
      ('STD-RD-END-1', 'it', 'Standard Road Endurance 1', 'Bici da corsa endurance per lunghe uscite rilassate.', $$### Comfort endurance su strada
La **Standard Road Endurance 1** e progettata per pedalare molte ore con meno fatica.

- Geometria endurance per postura piu comoda
- Passo stabile per guida prevedibile
- Telaio che riduce le vibrazioni
- Trasmissione fluida per lunghe distanze
- Freni a disco affidabili in ogni condizione

_Ideale per_: granfondo e allenamenti di durata.$$),
      ('STD-RD-END-1', 'es', 'Standard Road Endurance 1', 'Bicicleta de carretera endurance para tiradas largas y comodas.', $$### Carretera endurance comoda
La **Standard Road Endurance 1** esta hecha para largas horas con postura relajada.

- Geometria endurance para menos fatiga
- Distancia entre ejes estable
- Cuadro que filtra vibraciones
- Transmision suave para fondo
- Frenos de disco para control en cualquier clima

_Ideal para_: salidas largas y marchas cicloturistas.$$),

      -- STD-RD-END-2
      ('STD-RD-END-2', 'en', 'Standard Road Endurance 2', 'Comfort-focused road bike for mixed city and road use.', $$### Versatile endurance all-rounder
The **Standard Road Endurance 2** blends city practicality with road-bike efficiency.

- Upright-leaning fit for better visibility
- Fast rolling setup for asphalt and urban roads
- Predictable steering in traffic and open roads
- Durable components for daily mileage
- Easy service design for low maintenance

_Best for_: commuting during the week and longer rides on weekends.$$),
      ('STD-RD-END-2', 'de', 'Standard Road Endurance 2', 'Komfortorientiertes Rennrad für Stadt und Landstrasse.', $$### Vielseitig für Stadt und Tour
Das **Standard Road Endurance 2** kombiniert Alltagstauglichkeit mit effizientem Vortrieb.

- Etwas aufrechtere Sitzposition für bessere Übersicht
- Leichtlaufende Bereifung für Asphalt und Stadtverkehr
- Sicheres Lenkverhalten im Verkehr
- Robuste Komponenten für hohe Laufleistung
- Wartungsfreundlicher Aufbau

_Ideal für_: Pendeln und Wochenendtouren.$$),
      ('STD-RD-END-2', 'fr', 'Standard Road Endurance 2', 'Velo route confortable pour usage mixte ville et route.', $$### Polyvalent ville + route
Le **Standard Road Endurance 2** associe confort quotidien et rendement routier.

- Position plus relevee pour mieux voir
- Roulement rapide sur bitume
- Direction stable en circulation
- Composants robustes pour usage frequent
- Conception facile a entretenir

_Parfait pour_: trajets quotidiens et sorties weekend.$$),
      ('STD-RD-END-2', 'it', 'Standard Road Endurance 2', 'Bici da strada orientata al comfort per uso urbano e stradale.', $$### Versatile tra citta e strada
La **Standard Road Endurance 2** unisce praticita quotidiana e buon rendimento su asfalto.

- Posizione leggermente piu eretta
- Scorrevolezza elevata su asfalto
- Sterzo stabile nel traffico
- Componenti durevoli per uso frequente
- Manutenzione semplice

_Ideale per_: casa-lavoro e uscite del fine settimana.$$),
      ('STD-RD-END-2', 'es', 'Standard Road Endurance 2', 'Bici de carretera comoda para uso mixto ciudad y carretera.', $$### Equilibrio entre ciudad y ruta
La **Standard Road Endurance 2** ofrece comodidad diaria con buen rendimiento.

- Posicion ligeramente mas erguida
- Rodadura rapida en asfalto
- Direccion estable en trafico
- Componentes resistentes al uso diario
- Mantenimiento sencillo

_Ideal para_: ir al trabajo y salir a rodar el fin de semana.$$),

      -- STD-RD-CITY-1
      ('STD-RD-CITY-1', 'en', 'Standard Road City 1', 'Flat-bar road/city bike for daily commuting.', $$### Fast city commuter
The **Standard Road City 1** is designed for quick urban mobility and comfort.

- Flat handlebar for intuitive control
- Agile geometry for city maneuvering
- Efficient tires for low rolling resistance
- Mount points for fenders and rack
- Reliable braking for stop-and-go traffic

_Best for_: daily commuting, errands, and short fitness rides.$$),
      ('STD-RD-CITY-1', 'de', 'Standard Road City 1', 'Flatbar-Road/City-Bike für den täglichen Arbeitsweg.', $$### Schnelles City-Bike
Das **Standard Road City 1** bringt dich schnell und komfortabel durch die Stadt.

- Gerader Lenker für direkte Kontrolle
- Wendige Geometrie für den Stadtverkehr
- Effiziente Reifen mit geringem Rollwiderstand
- Aufnahmen für Schutzbleche und Gepäckträger
- Zuverlässige Bremsen für Stop-and-go

_Ideal für_: Pendeln, Erledigungen und kurze Trainingsrunden.$$),
      ('STD-RD-CITY-1', 'fr', 'Standard Road City 1', 'Velo route/city a guidon plat pour trajets quotidiens.', $$### Commuter urbain rapide
Le **Standard Road City 1** facilite les deplacements en ville au quotidien.

- Guidon plat pour un controle naturel
- Geometrie agile en environnement urbain
- Pneus efficaces a faible resistance
- Fixations pour garde-boue et porte-bagages
- Freinage fiable dans le trafic dense

_Parfait pour_: velotaf, courses et sorties courtes.$$),
      ('STD-RD-CITY-1', 'it', 'Standard Road City 1', 'Bici city/road a manubrio piatto per il pendolarismo quotidiano.', $$### Commuter urbano veloce
La **Standard Road City 1** e pensata per muoversi in citta in modo rapido e confortevole.

- Manubrio piatto per controllo immediato
- Geometria agile nel traffico urbano
- Pneumatici scorrevoli ed efficienti
- Predisposizione per parafanghi e portapacchi
- Frenata affidabile in stop-and-go

_Ideale per_: spostamenti casa-lavoro e commissioni.$$),
      ('STD-RD-CITY-1', 'es', 'Standard Road City 1', 'Bici urbana/de carretera con manillar plano para desplazamientos diarios.', $$### Urbana rapida y practica
La **Standard Road City 1** prioriza control y velocidad para la ciudad.

- Manillar plano para manejo intuitivo
- Geometria agil en calles urbanas
- Cubiertas de baja resistencia
- Anclajes para guardabarros y portabultos
- Frenada fiable en trafico intermitente

_Ideal para_: commuting diario y recados.$$),

      -- PRO-MTB-END-1
      ('PRO-MTB-END-1', 'en', 'Pro MTB Enduro 1', 'High-end enduro MTB with long-travel suspension.', $$### Race-capable enduro platform
The **Pro MTB Enduro 1** is tuned for aggressive descents and technical terrain.

- Long-travel suspension with progressive kinematics
- Stiff frame for precise line control
- Dropper post for dynamic body positioning
- Powerful 4-piston braking system
- Reinforced wheelset for enduro impacts

_Best for_: advanced riders, bike parks, and enduro race stages.$$),
      ('PRO-MTB-END-1', 'de', 'Pro MTB Enduro 1', 'High-End-Enduro-MTB mit langem Federweg.', $$### Enduro für anspruchsvolle Trails
Das **Pro MTB Enduro 1** ist auf schnelle Abfahrten und technisches Gelände ausgelegt.

- Fahrwerk mit viel Federweg und progressiver Kennlinie
- Steifer Rahmen für präzise Linienwahl
- Vario-Sattelstütze für aktive Fahrposition
- Kraftvolle 4-Kolben-Bremsanlage
- Verstärkter Laufradsatz für harte Einsätze

_Ideal für_: ambitionierte Fahrer und Enduro-Rennen.$$),
      ('PRO-MTB-END-1', 'fr', 'Pro MTB Enduro 1', 'VTT enduro haut de gamme a grand debattement.', $$### Enduro performance
Le **Pro MTB Enduro 1** est concu pour la vitesse en descente et les passages engages.

- Suspension grand debattement progressive
- Cadre rigide pour trajectoires precises
- Tige de selle telescopique
- Freinage 4 pistons tres puissant
- Roues renforcees pour gros impacts

_Parfait pour_: pilotes experimentes et competiteurs enduro.$$),
      ('PRO-MTB-END-1', 'it', 'Pro MTB Enduro 1', 'MTB enduro di alta gamma con lunga escursione.', $$### Enduro ad alte prestazioni
La **Pro MTB Enduro 1** e sviluppata per discese veloci e trail tecnici.

- Sospensioni a lunga escursione e cinematica progressiva
- Telaio rigido e preciso
- Reggisella telescopico
- Freni a 4 pistoni ad alta potenza
- Ruote rinforzate per impatti importanti

_Ideale per_: rider esperti, bike park e gare enduro.$$),
      ('PRO-MTB-END-1', 'es', 'Pro MTB Enduro 1', 'MTB enduro de alta gama con gran recorrido.', $$### Enduro de nivel competitivo
La **Pro MTB Enduro 1** esta preparada para bajadas agresivas y tramos tecnicos.

- Suspensiones de largo recorrido
- Cuadro rigido para trazadas precisas
- Tija telescopica
- Frenos de 4 pistones muy potentes
- Ruedas reforzadas para impactos duros

_Ideal para_: riders avanzados y carreras de enduro.$$),

      -- PRO-MTB-DH-1
      ('PRO-MTB-DH-1', 'en', 'Pro MTB Downhill 1', 'Downhill MTB for bike park and race tracks.', $$### Pure downhill machine
The **Pro MTB Downhill 1** is purpose-built for steep lines and maximum stability.

- Downhill-specific geometry with low center of gravity
- Heavy-duty suspension for repeated big hits
- High-grip tire setup for loose terrain
- Ultra-strong braking package
- Reinforced drivetrain for gravity use

_Best for_: bike parks, downhill tracks, and shuttle days.$$),
      ('PRO-MTB-DH-1', 'de', 'Pro MTB Downhill 1', 'Downhill-MTB für Bikepark und Rennstrecke.', $$### Reines Downhill-Bike
Das **Pro MTB Downhill 1** ist auf steiles Gelände und maximale Laufruhe optimiert.

- Downhill-Geometrie mit tiefem Schwerpunkt
- Belastbares Fahrwerk für grosse Schläge
- Gripstarke Bereifung für lose Untergründe
- Sehr starke Bremsanlage
- Verstärkter Antrieb für Gravity-Einsatz

_Ideal für_: Bikepark-Tage und Downhill-Strecken.$$),
      ('PRO-MTB-DH-1', 'fr', 'Pro MTB Downhill 1', 'VTT de descente pour bike park et pistes de course.', $$### Machine de descente pure
Le **Pro MTB Downhill 1** est optimise pour les pentes raides et la stabilite a haute vitesse.

- Geometrie downhill tres stable
- Suspension renforcee pour gros chocs
- Pneus a fort grip sur terrain meuble
- Freinage tres puissant
- Transmission robuste pour usage gravity

_Parfait pour_: bike parks et courses de descente.$$),
      ('PRO-MTB-DH-1', 'it', 'Pro MTB Downhill 1', 'MTB downhill per bike park e piste da gara.', $$### Pura downhill
La **Pro MTB Downhill 1** e progettata per pendenze elevate e massima stabilita.

- Geometria downhill con baricentro basso
- Sospensioni robuste per grandi impatti
- Pneumatici ad alto grip su terreni sconnessi
- Frenata estremamente potente
- Trasmissione rinforzata per uso gravity

_Ideale per_: bike park e gare di discesa.$$),
      ('PRO-MTB-DH-1', 'es', 'Pro MTB Downhill 1', 'MTB de descenso para bike park y pistas de carrera.', $$### Downhill pura
La **Pro MTB Downhill 1** esta hecha para pendientes fürtes y maxima estabilidad.

- Geometria especifica de descenso
- Suspensiones reforzadas para grandes impactos
- Neumaticos de alto agarre
- Frenos de maxima potencia
- Transmision robusta para uso gravity

_Ideal para_: bike parks y circuitos de descenso.$$),

      -- PRO-RD-RACE-1
      ('PRO-RD-RACE-1', 'en', 'Pro Road Race 1', 'Carbon race bike optimised for climbing and sprinting.', $$### Lightweight race performance
The **Pro Road Race 1** targets riders who want fast acceleration and efficient climbing.

- Carbon frame focused on stiffness-to-weight
- Aggressive race geometry
- Aerodynamic tube shaping
- Precise shifting under load
- High-performance wheelset for race pace

_Best for_: criteriums, hill stages, and competitive group rides.$$),
      ('PRO-RD-RACE-1', 'de', 'Pro Road Race 1', 'Carbon-Rennrad optimiert für Klettern und Sprint.', $$### Leichtes Race-Bike
Das **Pro Road Race 1** liefert schnelle Beschleunigung und starke Klettereigenschaften.

- Carbonrahmen mit optimalem Steifigkeits-Gewichts-Verhaeltnis
- Sportliche Race-Geometrie
- Aerodynamisch geformte Rohrprofile
- Präziser Antrieb auch unter Last
- Performance-Laufradsatz für Wettkampftempo

_Ideal für_: Rennen, Bergetappen und schnelle Gruppenausfahrten.$$),
      ('PRO-RD-RACE-1', 'fr', 'Pro Road Race 1', 'Velo carbone de course optimise pour grimpe et sprint.', $$### Rendement competition
Le **Pro Road Race 1** offre acceleration instantanee et excellent comportement en montee.

- Cadre carbone leger et rigide
- Geometrie course agressive
- Profils de tubes aero
- Changement de vitesses precis
- Roues performantes pour rythme eleve

_Parfait pour_: courses sur route et sorties sportives.$$),
      ('PRO-RD-RACE-1', 'it', 'Pro Road Race 1', 'Bici da corsa in carbonio ottimizzata per salita e sprint.', $$### Prestazioni da gara
La **Pro Road Race 1** garantisce accelerazione rapida e ottima resa in salita.

- Telaio in carbonio leggero e rigido
- Geometria racing aggressiva
- Tubazioni dal profilo aerodinamico
- Cambiata precisa sotto sforzo
- Ruote ad alte prestazioni

_Ideale per_: gare su strada e allenamenti veloci.$$),
      ('PRO-RD-RACE-1', 'es', 'Pro Road Race 1', 'Bici de carbono de carrera optimizada para subir y esprintar.', $$### Rendimiento de competicion
La **Pro Road Race 1** combina ligereza, rigidez y aceleracion inmediata.

- Cuadro de carbono muy eficiente
- Geometria de carrera agresiva
- Tubos con perfil aero
- Cambio preciso bajo carga
- Ruedas de alto rendimiento

_Ideal para_: carreras, puertos y grupetas rapidas.$$),

      -- PRO-RD-AERO-1
      ('PRO-RD-AERO-1', 'en', 'Pro Road Aero 1', 'Aero road bike for flat and fast courses.', $$### Aerodynamic speed focus
The **Pro Road Aero 1** minimizes drag for high-speed riding on flat terrain.

- Aero frame and fork profiles
- Integrated cockpit for cleaner airflow
- Deep-section wheels for momentum
- Race gearing for sustained speed
- Stable handling at high velocity

_Best for_: flat races, breakaways, and fast training blocks.$$),
      ('PRO-RD-AERO-1', 'de', 'Pro Road Aero 1', 'Aero-Rennrad für flache und schnelle Strecken.', $$### Geschwindigkeit mit Aerodynamik
Das **Pro Road Aero 1** reduziert Luftwiderstand für hohes Tempo auf flachen Kursen.

- Aero-Rahmen und Aero-Gabel
- Integriertes Cockpit für sauberen Luftstrom
- Hohe Felgen für besseren Speed-Erhalt
- Übersetzung für dauerhaft hohes Tempo
- Souveraenes Handling bei hoher Geschwindigkeit

_Ideal für_: flache Rennen und schnelle Trainings.$$),
      ('PRO-RD-AERO-1', 'fr', 'Pro Road Aero 1', 'Velo route aero pour parcours plats et rapides.', $$### Vitesse aerodynamique
Le **Pro Road Aero 1** est developpe pour reduire la trainee a grande vitesse.

- Cadre et fourche aero
- Poste de pilotage integre
- Roues a profil haut
- Transmission orientee vitesse
- Excellente stabilite a haute allure

_Parfait pour_: courses plates et echappees rapides.$$),
      ('PRO-RD-AERO-1', 'it', 'Pro Road Aero 1', 'Bici aero da strada per percorsi veloci e pianeggianti.', $$### Velocita aerodinamica
La **Pro Road Aero 1** riduce la resistenza all'aria per mantenere alte medie.

- Telaio e forcella aero
- Cockpit integrato
- Ruote ad alto profilo
- Rapporti pensati per la velocita
- Stabilita elevata alle alte andature

_Ideale per_: gare pianeggianti e allenamenti intensi.$$),
      ('PRO-RD-AERO-1', 'es', 'Pro Road Aero 1', 'Bici aero de carretera para recorridos llanos y rapidos.', $$### Velocidad con enfoque aero
La **Pro Road Aero 1** esta diseñada para cortar el viento y mantener ritmos altos.

- Cuadro y horquilla aerodinamicos
- Cockpit integrado
- Ruedas de perfil alto
- Desarrollo enfocado a velocidad
- Gran estabilidad a alta velocidad

_Ideal para_: etapas llanas y entrenamientos de alta intensidad.$$),

      -- PRO-RD-GRVL-1
      ('PRO-RD-GRVL-1', 'en', 'Pro Road Gravel 1', 'Gravel bike for mixed-surface adventures and bikepacking.', $$### Gravel adventure platform
The **Pro Road Gravel 1** is built for long routes across asphalt, dirt, and gravel.

- Gravel-tuned geometry for stability and comfort
- Clearance for wider tires
- Multiple mounting points for bags and bottles
- Drivetrain range for steep mixed terrain
- Disc brakes for confident control off-road

_Best for_: bikepacking, adventure rides, and all-road exploration.$$),
      ('PRO-RD-GRVL-1', 'de', 'Pro Road Gravel 1', 'Gravelbike für gemischte Untergründe und Bikepacking.', $$### Gravel für Abenteuer
Das **Pro Road Gravel 1** ist für lange Touren auf Asphalt, Schotter und Feldwegen gebaut.

- Gravel-Geometrie für Stabilität und Komfort
- Platz für breitere Reifen
- Viele Montagepunkte für Taschen und Flaschen
- Breite Übersetzung für steile Passagen
- Scheibenbremsen für sicheres Bremsen im Gelände

_Ideal für_: Bikepacking und Allroad-Abenteuer.$$),
      ('PRO-RD-GRVL-1', 'fr', 'Pro Road Gravel 1', 'Velo gravel pour aventures tous terrains et bikepacking.', $$### Gravel polyvalent
Le **Pro Road Gravel 1** accompagne les longues sorties sur route et chemins.

- Geometrie gravel stable et confortable
- Degagement pneus plus large
- Nombreux points de fixation
- Transmission adaptee aux reliefs varies
- Freins a disque efficaces hors route

_Parfait pour_: voyages a velo et exploration tout-chemin.$$),
      ('PRO-RD-GRVL-1', 'it', 'Pro Road Gravel 1', 'Bici gravel per avventure su fondi misti e bikepacking.', $$### Gravel da esplorazione
La **Pro Road Gravel 1** e pronta per lunghe distanze tra asfalto, sterrato e ghiaia.

- Geometria gravel stabile e confortevole
- Ampio passaggio ruota per coperture larghe
- Numerosi punti di fissaggio per borse
- Rapporti adatti a terreni variabili
- Freni a disco per controllo su sterrato

_Ideale per_: bikepacking e avventure all-road.$$),
      ('PRO-RD-GRVL-1', 'es', 'Pro Road Gravel 1', 'Bicicleta gravel para aventuras en superficies mixtas y bikepacking.', $$### Gravel para aventura
La **Pro Road Gravel 1** esta preparada para rutas largas en asfalto y tierra.

- Geometria gravel estable y comoda
- Paso de rueda para cubiertas mas anchas
- Multiples anclajes para bolsas y bidones
- Amplio rango de marchas para terreno mixto
- Frenos de disco para control füra de carretera

_Ideal para_: bikepacking y exploracion all-road.$$)
  ) AS t(sku, locale, name, description, detailed_description)
    ON p.sku = t.sku
)
INSERT INTO product_translations (
  product_id,
  locale,
  name,
  description,
  detailed_description
)
SELECT
  src.product_id,
  src.locale,
  src.name,
  src.description,
  src.detailed_description
FROM src
ON CONFLICT (product_id, locale)
DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  detailed_description = EXCLUDED.detailed_description,
  updated_at = now();

SELECT locale, COUNT(*) AS rows_per_locale
FROM product_translations
GROUP BY locale
ORDER BY locale;
EOSQL
)

docker exec -i "$CONTAINER" sh -c '
  set -eu
  export PGPASSWORD="$POSTGRES_PASSWORD"
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
' <<< "$SQL"

echo "==> Product translation seeding finished 🎉"
