#El preu de l'abundància

## Introducció
Aquest projecte conté el joc creat amb tecnologies web per a [la campanya de concienciació d'Enginyers Sense Fronteres](http://www.elpreudelabundancia.org/). El codi de la carpeta `src` d'aquest projecte es pot vincular a un projecte Apache Cordova per a obtenir una versió encapsulada per a dispositius mòbils.

## Requisits
+ Sass + Compass (ruby, doncs)
+ PHP, PoEdit
+ Un servidor web local per a desenvolupament
+ (Opcional) Apache Cordova 3.1.0 amb els plugins [InAppBrowser](http://cordova.apache.org/docs/en/3.1.0/cordova_inappbrowser_inappbrowser.md.html#InAppBrowser) i [Splashscreen](http://cordova.apache.org/docs/en/3.1.0/cordova_splashscreen_splashscreen.md.html#Splashscreen) activats.

## Estructura
+ `src`
	+ `assets` arrel del projecte Compass, on cal executar `compass compile`
		- `fonts`
		- `img`
		- `js`
		- `sass` els que cal editar
		- `stylesheets` generades per sass
		- `vendor` dependències externes
						
	+ `i18n` conté els \*.po, \*.mo i les cadenes definitives \*.js
	
+ `PHP-po-parser/` una eina per a parsejar fitxers po.

+ `update_trans.php` utilitza la llibreria anterior per a convertir po en json. 

+ `index.html` punt d'entrada del joc

El que jo faig és crear un enllaç simbòlic del projecte_cordova/www/src a la carpeta src d'aquest projecte per a poder tenir-los independents. 

## Traduccions / cadenes de text
Primer cal configurar PoEdit per a que pugui parsejar els fitxers JS. Farem servir l'analitzador de Python i afegirem l'extensió *.js

![image](http://softwaremeetsdesign.com/Coses/Poedit%20JS%20parser.png)

Si no m'equivoco, els propis *.po contenen la informació dels camins on es troben els fitxers font. Pot ser més pràctic centralitzar la importació de noves cadenes a partir del codi per a que no tingueu conflictes en aquest valor.

![image](http://softwaremeetsdesign.com/Coses/Po%20file%20js%20sources.png)

El procés d'actualització de cadenes és, doncs:

1. Crear una nova cadena al JS. Jo les tinc totes a `esf.js` per comoditat (a manca d'*includes*). Fem servir la notació de gettext `_("nova cadena")`.
2. Actualitzar el messages_xx.po fent servir l'opció **Catàleg > Update from Sources**
3. Traduïm les noves cadenes aparegudes.
4. Si tenim l'opció de generar un .mo automàticament en desar, PoEdit crearà messages_xx.mo just al costat del fitxer .po que hem obert. *En realitat amb el nou procés de traducció crec que els .mo ja no són necessaris, parsegem els .po directament.*
5. Executem `php update_trans.php` des de l'arrel del projecte per a generar els .js a partir dels nou .po. Aquests són els fitxers que llegeix `esf.js`, una traducció o edició de text no apareixerà fins que no actualitzem el .js

## Imatges d'elements
+ La majoria d'imatges SVG han estat processades amb SVGO per a reduir la mida:
`sudo npm install -g svgo`
+ Per a obtenir els PNGs utilitzo imagemagick des d'uns VM linux, cridat des de l'script `convertSVG2PNG.sh` de la pròpia carpeta dels PNGs. Simplement es tracta de posar una còpia de cada SVG original (**no optimitzat amb SVGO**) a la carpeta dels PNGs i executar l'script. No sobreescriu mai el fitxer anterior, per tant assegurar-se que no existeixen abans d'executar. Això permet executar aquest script només per a crear els nous PNGs dels quals haguem afegit el SVG, deixant la resta intactes.
+ Després de generar el PNG es bona idea esborrar el fitxer SVG per tal de mantenir la mida de l'app.

## Fluxe del codi (esf.js)
+ es carrega l'HTML, on hi ha un bloc `<script>` que crida a esfab.init() amb un objecte de configuració.

`<script type="text/javascript">esfab.init({"cordova": false});</script>`
L'única diferència entre l'HTML del joc per navegadors i el que s'encapsularà per a aplicació nativa és el paràmetre cordova que se li passa al mètode esfab.init() i la càrrega al `<head>` de la llibreria `cordova.js`.

+ `esfab.startLoading()` carrega l'estat i prepara el terreny de joc. Les traduccions es carreguen de forma asíncrona, s'afegeix un tag `<script>` al `<head>` de forma dinàmica i s'ha d'esperar que es descarregui el fitxer que conté les cadenes de text (esdeveniment `onLoad`). Per això activem el booleà `esfab.waitingToStart`.

+ `esfab.initTranslations()` defineix com a listener de `onLoad` una funció anònima que bàsicament crida a `esfab.reloadTextLabels()` per a recarregar totes les etiquetes i si estem esperant que comenci el joc també carrega els elements a la graella amb `esfab.setupLevel()` i posa la màquina d'estats en marxa a l'estat base: `esfab.fsm.Loaded()`.

+ A partir d'aquí ens movem tota l'estona amb els esdeveniments generats per la màquina d'estats, per exemple a l'inici: `esfab.fsm.onLoaded()`. La resta d'esdeveniments de la màquina solen ser iniciats per acció tàctil de l'usuari en alguna de les situacions cobertes a `esfab.initListeners()`.
