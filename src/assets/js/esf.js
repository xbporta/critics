(function ($) {
  // encapsulem dins d'una variable per evitar conflictes
  window.esfab = window.esfab || {};

  //!Game variables
  esfab.selectedItems = []; // conté 0,1 o 2 elements seleccionats
  esfab.ingredientList = {}; // tots els elements del joc, inicialitzat més tard per i18n

  // definició de totes les mescles de forma textual
  // per afegir una nova mescla simplement afegir-la a l'array
  esfab.mixTable = {
    "persona+persona":      9,  // comunitat
    "persona+politica":	    10, // politic
    "terra+terra":	        11, // territori
    "comunitat+economia":	  12, // mercat
    "comunitat+politica":	  13, // govern
    "territori+govern":     14, // estat
    "estat+territori":	    15, // fronteres
    "estat+economia":	      16, // pib
    "fronteres+mercat":	    17, // tlc
    "persona+economia":	    18, // empresa
    "empresa+minerals":	    19, // empresa minera
    "persona+minerals":	    20, // miner
    "territori+minerals":	  22, // jaciment
    "animal+animal":	      23, // fauna
    "aigua+aigua":	        24, // riu
    "arbre+arbre":	        25, // bosc
    "terra+aigua":	        26, // aquifer
    "empresa_minera+jaciment":	           27, // interes empresarial
    "interes_empresarial+govern":	         28, // permis dexplotacio
    "interes_empresarial+politic":         29, // corrupcio
    "govern+corrupcio":	                   28, // permis dexplotacio
    "empresa_minera+permis_dexplotacio":	 30, // mina
    "mina+bosc":	                         31, // deforestacio
    "mina+aquifer":	                       32, // sequera
    "mina+territori":	                     33, // contaminacio
    "mina+fauna":	                         34, // extincio despecies
    "riu+contaminacio":	                   35, // enverinament
    "comunitat+contaminacio":	             36, // malalties
    "comunitat+terra":                     41, // Agricultura
    "comunitat+fauna":                     42, // Ramaderia
    "ramaderia+agricultura":               43, // Mitjans de substistència
    "impactes_ambientals+mitjans_subsistencia": 46, // Desplaçaments
    "desplaçaments+comunitat":				47, // Desarrelament
    "empresa+globalitzacio":				48, // Transnacional
    "tlc+transnacional":					49, // Espoli
    "mitjans_subsistencia+desplaçaments":	50, // Empobriment
    "transnacional+govern":					51, // lobby_de_poder
    "transnacional+lobby_de_poder":			52, // Desigualtat econòmica
    "empobriment+interes_empresarial":		53, // Precarietat laboral
    "desigualtat_economica+comunitat":		54, // Protesta social
    "protesta_social+govern":				55, // Criminalització
    "criminalitzacio+protesta_social":		56, // Revolta social
    "revolta_social+exercit":				57, // Conflictes armats
    "conflictes_armats+interes_empresarial": 58, // Comerç d'armes
    "transnacional+exercit" :				59, // Militarització
    "transnacional+protesta_social" :		60, // Seguretat privada
    "seguretat_privada+protesta_social" :	61, // Espionatge
    "protesta_social+exercit" :				62  // Violacions DDHH
  };
  

  // Definició de nivells: elements d'inici i condició de final de joc
  esfab.startingIngredients = {
    1: [1,2,3,4,5,6,7,8],
    2: [40,44,45]
  };

  /*
  *  3 tipus de condició:
  *   NUM_UNLOCKED: valor N (int). S'arriba a un cert nombre N d'elements desbloquejats
  *   ITEM_UNLOCKED: valor i (int). Es desbloqueja l'element amb índex i.
  *   ITEM_COLLECTION_UNLOCKED: valor col array de ints.
  *     Es desbloquegen tots els elements de la col·leció, en qualsevol ordre
  */
  esfab.endOfLevelCondition = {
    1: {'type': 'ITEM_COLLECTION_UNLOCKED',   'val': [31,32,33,34,35,36]},
    2: {'type': 'ITEM_COLLECTION_UNLOCKED',   'val': [31,32,33,34,35,36,47,53,57,58,59,61,62]}
    
    // 2: {'type': 'ITEM_UNLOCKED',  'val': 10000},
    //3: {'type': 'NUM_UNLOCKED',  'val': 4}
  };

  esfab.currentLevel = 1;
  esfab.unlockedIngredients = [];
  esfab.gridIngredients = esfab.startingIngredients[1];
  console.log(esfab.gridIngredients);
  esfab.animationDelay = 300; // base que es fa servir per a diversos delays durant el joc

  // Temps de mostra dels missatges de text curts, mitjans i llargs (modificables)
  esfab.quickMsgAutoDismissTimeout = 2000;
  esfab.slowMsgAutoDismissTimeout = 5000;
  esfab.superSlowMsgAutoDismissTimeout = 8000;

  esfab.lang = null;
  esfab.defaultLang = 'ca';
  esfab.i18n = null;
  esfab.waitingToStart = false;

  // referències a iscroll
  esfab.grid1iScroll = null;
  esfab.grid2iScroll = null;
  esfab.paneliScroll = null;

  /*
   * Màquina d'estats, llegir la documentació a
   * https://github.com/jakesgordon/javascript-state-machine
   *
   * Només el joc està representat en la FSM (finite state machine).
   * Accions com menú o missatges poden mostar-se en qualsevol estat.
   * Fluxe combinació errònia:  Base -> OneSelected -> TwoSelected -> Base
   * Fluxe combinació correcta: Base -> OneSelected -> TwoSelected -> ItemUnlocked -> (NewLevel) -> Base
   *
   * La columna de més a l'esquerra són els noms d'esdeveniments que es fan servir per canviar d'estat.
   *
   */
  esfab.fsm = StateMachine.create({
    initial: 'Loading',
    events: [
      { name: 'Loaded',             from: 'Loading',              to: 'Base'          },
      { name: 'SelectOne',          from: ['Base','OneSelected'], to: 'OneSelected'   },
      { name: 'UnselectOne',        from: 'OneSelected',          to: 'Base'          },
      { name: 'SelectTwo',          from: 'OneSelected',          to: 'TwoSelected'   },
      { name: 'NoMix',              from: 'TwoSelected',          to: 'Base'          },
      { name: 'MixSuccess',         from: 'TwoSelected',          to: 'ItemUnlocked'  },
      { name: 'UnlockingRevealed',  from: 'ItemUnlocked',         to: 'Base'          },
      { name: 'NewLevel',           from: 'ItemUnlocked',         to: 'Base'          }
  ]});

  //!Game setup methods

  // Ajusta les mides del joc a la pantalla, per exemple calculant una nova mida d'element
  // per omplir tot l'ample de la pantalla.
  esfab.calcDimensions = function() {
    var viewportH = $(window).height();
    var availableH = viewportH - $("header").outerHeight() - $("#elts-grid-one").outerHeight() - $("#mix-zone").outerHeight();
    $("#elts-grid-two").height(availableH);
    var containerWidth = $("#elts-grid-two .elts-list").innerWidth();
    var numSquaresPerLine = Math.floor( containerWidth / 58);
    var squareSide = Math.floor((containerWidth / numSquaresPerLine)-2); //expand them
    //console.log(containerWidth + ','  + numSquaresPerLine + "," + squareSide);

    // Un bloc de css inline on fem servir String.replace en no tenir printf
    var styleBlock = "<style type='text/css' id='dynamic-styles'> .elts-grid .elt { width: %sq%px; height: %sq%px; line-height: %sq%px; } #elts-grid-one .elts-list { height: %gsplus%px; } #elts-grid-one .elts-list { background-size: %gs%px %gs%px, %gs%px %gs%px; } #elts-grid-two .elts-list { background-size: %gs%px %gs%px, %gs%px %gs%px;}</style>";
    styleBlock = styleBlock.replace(/%sq%/g, squareSide);
    styleBlock = styleBlock.replace(/%gs%/g, squareSide+2);
    styleBlock = styleBlock.replace(/%gsplus%/g, squareSide+4);
    styleBlock = styleBlock.replace(/%gamefinalw%/g, numSquaresPerLine*(squareSide+2));
    $("#dynamic-styles").remove(); //ensure no duplication
    $(styleBlock).appendTo("head");
  };

  // Inicia els listeners touch amb HammerJS com a plugin de Jquery
  esfab.initListeners = function() {

    $(window).resize(esfab.calcDimensions);
    window.addEventListener('orientationchange', esfab.calcDimensions);
    
    // Mostra títol i descripció d'un element en fer long press
    $(".elts-grid").hammer().on("hold", ".elt", function(evt) {
      var eltObj = esfab.ingredientList[$(this).data("elt")];
      var msgToShow = eltObj.name;
      if (eltObj.hasOwnProperty("desc")) {
        msgToShow += ": " + eltObj.desc;
      }
      esfab.showFloatingMessage(msgToShow);
    });

    // Selecció d'element
    $("#elts-grid-two").off("tap", ".elt");
    $("#elts-grid-two").on("tap", ".elt", function(evt) {
      if (evt) {
        evt.preventDefault();
      }

      if (esfab.fsm.is('Base')) {
        esfab.fsm.SelectOne($(this));
      } else if (esfab.fsm.is('OneSelected')) {
        esfab.fsm.SelectTwo($(this));
      }

    });

    // Missatge d'ajuda
    $("#help").hammer().off("tap");
    $("#help").hammer().on("tap", function(evt) {
      if (evt) {
        evt.stopPropagation();
      }

      $("#main-menu").removeClass("active");
      esfab.showFloatingPanel(_("Ajuda"), _("Missatge complet d'ajuda (HTML)"));

    });
    
    // Prova llista idiomes
    $("#idioma").hammer().off("tap");
    $("#idioma").hammer().on("tap", function(evt) {
      if (evt) {
        evt.stopPropagation();
      }

      $("#main-menu").removeClass("active");
      var menuIdiomes = "<h2>Idioma</h2>";
	menuIdiomes += "<ul>";
	menuIdiomes += "<li class='divider'><a id='lang-ca' class='menu-link' href='#'>Català</a></li>"
	menuIdiomes += "<li><a id='lang-es' class='menu-link' href='#'>Castellà</a></li>";
	menuIdiomes += "</ul>";
      
      esfab.showFloatingMessage(menuIdiomes);

	    $("#lang-ca").hammer().off("tap");
	    $("#lang-ca").hammer().on("tap", function(evt) {
	      if (evt) {
		evt.stopPropagation();
	      }

	      if (esfab.lang != 'ca') {
		esfab.initTranslations('ca');
	      }  
	        esfab.dismissFloatingPanel();
        	evt.stopPropagation();

	    });

	    $("#lang-es").hammer().off("tap");
	    $("#lang-es").hammer().on("tap", function(evt) {
	      if (evt) {
		evt.stopPropagation();
	      }

	      if (esfab.lang != 'es') {
		esfab.initTranslations('es');
	      }
	        esfab.dismissFloatingPanel();
        	evt.stopPropagation();
	
	    });
    });

 // Finestra col·laboradors
    $("#collab").hammer().off("tap");
    $("#collab").hammer().on("tap", function(evt) {
      if (evt) {
        evt.stopPropagation();
      }

      $("#main-menu").removeClass("active");
      var titol_coll = _("titol_collab");
      var collaboradors = "<h2>"+titol_coll+"</h2>";
	collaboradors += "<ul>";
	collaboradors += "<li class='divider'><a id='ajbcn' class='menu-link' href='#'><img src='src/assets/img/logoAjBCN.jpg' alt='AjBCN' style='max-height: 100px;max-width:90%;'></a></li>"
	collaboradors += "<li><a id='accd' class='menu-link' href='#'><img src='src/assets/img/logoACCD.jpg' alt='ACCD' style='max-height: 100px;max-width:90%;'></a></li>";
	collaboradors += "</ul>";
      
      esfab.showFloatingMessage(collaboradors);

	    $("#ajbcn").hammer().off("tap");
	    $("#ajbcn").hammer().on("tap", function(evt) {
	      if (evt) {
		evt.stopPropagation();
	      }
	      
	      var ref = esfab.openLinkInBrowser(_("url_ajbcn"));
		esfab.dismissFloatingPanel();
        	evt.stopPropagation();

	    });

	    $("#accd").hammer().off("tap");
	    $("#accd").hammer().on("tap", function(evt) {
	      if (evt) {
		evt.stopPropagation();
	      }
	      var ref = esfab.openLinkInBrowser(_("url_accd"));
	        esfab.dismissFloatingPanel();
        	evt.stopPropagation();
	
	    });
    });

    // TODO Reinicia el nivell. Actualment reinicia Joc
    $("#reset-level").hammer().off("tap");
    $("#reset-level").hammer().on("tap", function(evt) {
      if (evt) {
        evt.stopPropagation();
      }

      $("#main-menu").removeClass("active");
      esfab.showConfirmPanel(_("Reinicia el joc"),
        _("reset_game_msg"), "esfab.resetGame()", _("Reinicia"));
    });

    // Més info (menú principal)
    $("#more-info").hammer().off("tap");
    $("#more-info").hammer().on("tap", function(evt) {
      if (evt) {
        evt.stopPropagation();
      }
      $("#main-menu").removeClass("active");
      var ref = esfab.openLinkInBrowser(_("URL més info"));
    });

    // Menú principal: tecla de menú Android i botó toggle
    document.addEventListener("menubutton", esfab.showOrHideMenu, false);
    $("#toggle-menu").hammer().off("tap");
    $("#toggle-menu").hammer().on("tap", esfab.showOrHideMenu);

    // Deselecció d'element
    $("#mix-zone").hammer().off("tap swipe");
    $("#mix-zone").hammer().on("tap swipe", function(evt) {
      if (esfab.fsm.is("OneSelected")) {
        esfab.fsm.UnselectOne();
      }
    });

    // Amaga missatges i menús en tocar fora
    $("body").hammer().on("tap", function(evt) {
      if ($("#main-menu").hasClass('active') &&
          $(evt.target).attr('id') !== 'toggle-menu' &&
          $(evt.target).parents("#main-menu").length == 0) {
        $("#main-menu").removeClass("active");
      } else if ($("#info-msg").is(":visible") && !($("#info-msg").hasClass('info-panel'))) {
        esfab.dismissFloatingMessage();
        evt.stopPropagation();
      }
    });

    // Botó d'amagar missatge
    $('#info-msg').hammer().off('tap', '#dismiss-panel');
    $('#info-msg').hammer().on('tap', '#dismiss-panel', null, esfab.dismissFloatingPanel);
  };

  // Menú principal: inicialitza les opcions
  esfab.fillMenuOptions = function() {
    //$('#main-menu #toggle-lang').text(_("Canvi d'idioma"));

    $('#main-menu #help').text(_("Ajuda"));
    $('#main-menu #idioma').text("Idioma");
	$('#main-menu #reset-level').text(_("Reinicia el joc"));
    $('#main-menu #more-info').text(_("Més info"));
    $('#main-menu #collab').text(_("menu_collab"));
    $('#main-menu #level-one-info').remove();

/*    if (esfab.currentLevel > 1) {
      $('#main-menu #more-info').
        before('<li class="divider"><a id="level-one-info" class="menu-link" href="#" onclick="esfab.showEOLMsg(1);return false;">'+_("Impactes ambientals")+'</a></li>');
    } */
  };

  // Omple les graelles segons l'estat del joc
  esfab.fillIngredientList = function() {
    //console.log("Filling ingredients for level " + esfab.currentLevel);
    var levelToLoad = esfab.currentLevel;
    if (!esfab.startingIngredients.hasOwnProperty(levelToLoad)) {
      // game over? stay at the last level
      //console.log("Going back one level as we're past the last");
      levelToLoad--;
    }


/* XAVI: PRINCIPI DE SOLUCIÓ */
/*     var ingredients = esfab.startingIngredients[1].slice(0); //clone, not ref.

    $.each(esfab.unlockedIngredients, function(i, el) {
       if($.inArray(el, ingredients) === -1) ingredients.push(el);
    });
    
    if (esfab.currentLevel == 2) {
		$.each(esfab.startingIngredients[2], function(i, el) {
		   if($.inArray(el, ingredients) === -1) ingredients.push(el);
		});	
	}
*/    
    var ingredients = []
    
    $.each(esfab.gridIngredients, function(i, el) {
       if($.inArray(el, ingredients) === -1) ingredients.push(el);
    });
	console.log(ingredients);

/*	
    var ingredients = esfab.startingIngredients[levelToLoad].slice(0); //clone, not ref.

    $.each(esfab.unlockedIngredients, function(i, el) {
       if($.inArray(el, ingredients) === -1) ingredients.push(el);
    });
*/
    for (var i = 0, nextIngredient; i < ingredients.length; i++) {
      esfab.addIngredientToMainGrid(ingredients[i]);
      nextIngredient = esfab.ingredientList[ingredients[i]];

      if (nextIngredient.hasOwnProperty("isFinal") && nextIngredient.isFinal) {
        esfab.addIngredientToSecondaryGrid(ingredients[i]);
      }
    }

    // iscroll permet fer scroll en navegadors mòbils dins de contenidors (div)
    esfab.grid1iScroll = new iScroll('elts-grid-one',
      { hScroll: true, vScroll: false, hideScrollbar: true, fadeScrollbar: true }
    );
    esfab.grid2iScroll = new iScroll('elts-grid-two',
      { hScroll: false, vScrollbar: true, hideScrollbar: true, fadeScrollbar: true }
    );
  };

  // Funció d'inici del joc.
  // Sincronitza amb un boolean la càrrega del joc (traduccions, principalment)
  esfab.startLoading = function() {
    esfab.calcDimensions();
    esfab.initTranslations();
    esfab.loadGameState();
    esfab.waitingToStart = true;
  };

  // Prepara el terreny de joc segons l'estat
  // Mostra el missatge de benvinguda
  esfab.setupLevel = function() {
    //console.log("Setting up level " + esfab.currentLevel);
    esfab.clearGrids();
    esfab.fillIngredientList();
    esfab.initListeners();
    if (esfab.currentLevel == 1 && localStorage["esfab.start_msg_shown"] !== "true") {
      esfab.showFloatingPanel(_("Benvingut!"), _("msg_start_game"));
      localStorage["esfab.start_msg_shown"] = "true";
    }

  };

  // Reinicia el joc
  esfab.resetGame = function() {
    esfab.currentLevel = 1;
    esfab.unlockedIngredients.length = 0;
    esfab.gridIngredients = esfab.startingIngredients[1];
    esfab.saveGameState();
    esfab.setupLevel();
  };


  // TODO Reinicia el nivell
  esfab.resetLevel = function() {
    // TODO: adapt to multi-level game.
    // Depends on what should happen to unlocked elements (continuity or not)
    // esfab.currentLevel = 1;
    if (esfab.currentLevel == 1) {
		esfab.resetGame();
	}
    else {
		esfab.unlockedIngredients.length = 0;
		esfab.saveGameState();
		esfab.setupLevel();	
	}
    
  };

  // Carrega el fitxer json amb les traduccions segons
  // l'idioma de l'usuari
  esfab.initTranslations = function(newLang) {
    if (typeof newLang === 'undefined') {
      newLang = localStorage["esfab.lang"];
      if (!newLang) {
        newLang = esfab.defaultLang;
      }
    }

    $("#i18n-po").remove();
    esfab.loadScript(
      'src/i18n/messages_' + newLang + '.js',
      'i18n-po',
      function( data, textStatus, jqxhr ) {
        esfab.lang = newLang;
        localStorage["esfab.lang"] = esfab.lang;
        //console.log("init translations " + esfab.lang);
        var jedConfig = {
          "" : {
            "domain" : "esf",
            "lang"   : esfab.lang,
            "plural_forms" : "nplurals=2; plural=(n != 1);"
          }
        };
        jedConfig = $.extend(jedConfig, esf_messages);
        esfab.i18n = new Jed({
          locale_data : {
            "esf" : jedConfig
          },
          "domain" : "esf"
        });

        esfab.reloadTextLabels(); // Important, reescriu les etiquetes ja visibles

        // Arrenca el joc si estàvem esperant
        if (esfab.waitingToStart) {
          esfab.setupLevel();
          esfab.fsm.Loaded();
          esfab.waitingToStart = false;
        }
      },
      function( jqxhr, settings, exception ) {
        alert("No s'han pogut carregar les traduccions");
      }
      );
  };

  // Reescriu les etiquetes amb l'idioma seleccionat
  // A la pràctica el llistat d'ingredients s'inicialitza aquí per
  // poder refrescar títols i descripcions
  esfab.reloadTextLabels = function() {

    esfab.fillMenuOptions();

    $("#joc-el-preu header > h1").text(_("El preu de l'abundància"));
    esfab.ingredientList = {
      1:  {cls: "persona",   name: _("persona")    },
      2:  {cls: "politica",  name: _("politica")      },
      3:  {cls: "economia",  name: _("economia")      },
      4:  {cls: "terra",     name: _("terra")         },
      5:  {cls: "aigua",     name: _("aigua")         },
      6:  {cls: "minerals",  name: _("minerals")      },
      7:  {cls: "arbre",     name: _("arbre")         },
      8:  {cls: "animal",    name: _("animal")        },
      9:  {cls: "comunitat", name: _("comunitat")     },
      10: {cls: "politic",	  name: _("politic")      },
      11: {cls: "territori",	name: _("territori")    },
      12: {cls: "mercat",	name: _("mercat")            },
      13: {cls: "govern",	name: _("govern")            },
      14: {cls: "estat",	name: _("estat")            },
      15: {cls: "fronteres",	name: _("fronteres")      },
      16: {cls: "pib",	name: _("pib"), desc: _("Producte Interior Brut. Indicador convencional per mesurar el creixement ecònomic d'un país. Valoritza monetàriament el productes i serveis generats en un país, sense tenir en compte la distribució de la riquesa, el benestar social ni els recursos naturals destruïts per a la producció.")},
      17: {cls: "tlc",	name: _("tlc"), desc: _("Tractat de Lliure Comerç. Els TLC són acords comercials regionals o bilaterals que prioritzen els privilegis i guanys dels inversors enfront els drets del poble. Bàsicament consisteixen en eliminar o reduir els aranzels per aconseguir la liberització màxima del mercat.")},
      18: {cls: "empresa",	name: _("empresa")},
      19: {cls: "empresa_minera",	name: _("empresa_minera")},
      20: {cls: "miner",	name: _("miner")},
      22: {cls: "jaciment",	name: _("jaciment")},
      23: {cls: "fauna",	name: _("fauna")},
      24: {cls: "riu",	name: _("riu")},
      25: {cls: "bosc",	name: _("bosc")},
      26: {cls: "aquifer",	name: _("aquifer")},
      27: {cls: "interes_empresarial",	name: _("interes_empresarial")},
      28: {cls: "permis_dexplotacio",	name: _("permis_dexplotacio")},
      29: {cls: "corrupcio",	name: _("corrupcio"), desc: _("La corrupció fa que es donin permissos d'explotació en espais naturals protegits o en territoris de pobles ancestrals sense prèvia consulta.")},
      30: {cls: "mina",	name: _("mina")},
      31: {cls: "deforestacio",
          name: _("deforestacio"),
          desc: _("L'activitat minera comporta una important pèrdua de vegetació deguda al moviment de terres, la pluja àcida i a les micropartícules nocives suspeses en l’aire degut a les voladures realitzades per al moviment de terres."),
          isFinal: true
          },
      32: {cls: "sequera",
          name: _("sequera"),
          desc: _("Les empreses mineres extreuen un volum d'aigua incompatible amb l'activitat agrícola i ramadera, alhora que limiten l'accés a aigua potable de la població."),
          isFinal: true
          },
      33: {cls: "contaminacio",
          name: _("contaminacio"),
          desc: _("Els metalls pesants i altres productes químics altament nocius o cancerígens (com ara el cianur o els hidrocarburs aromàtics policíclics), provoquen acidificació dels aqüífers i la contaminació de les conques hídriques."),
          isFinal: true
          },
      34: {cls: "desaparicio_despecies",
          name: _("desaparicio_despecies"),
          desc: _("Per obtenir 1g d'or cal remoure 1 tona de terra i irrigar-la amb cianur. L'extracció i processament de minerals provoca la desaparició dels hàbitats que aboquen a les espècies a l'extinció."),
          isFinal: true
          },
      35: {cls: "enverinament",
          name: _("enverinament"),
          desc: _("La presència de metalls pesants en l'aigua per a ús domèstic és habitual en pobles i ciutats que s'abasteixen de conques amb activitat minera. Aquests contaminants tenen efectes sobre la salut a mitjà i llarg termini."),
          isFinal: true
          },
      36: {cls: "malalties",
          name: _("malalties"),
          desc: _("Les comunitats properes a zones d'activitat d'indústries extractives són altament sensibles a patir problemes de salut deguts a una exposició permanent a fonts de contaminació i a vessaments accidentals que produeixen una exposició a nivells de contaminació molt per sobre dels estándards ambientals. Exemple: vessament de mercuri a Choropampa any 2000."),
          isFinal: true
          },
      37: {cls: "perdua_biodiversitat",
          name: _("perdua_biodiversitat")},
      40: {cls: "impactes_ambientals",	name: _("impactes_ambientals")},
      41: {cls: "agricultura",	name: _("agricultura")},
      42: {cls: "ramaderia",	name: _("ramaderia")},
      43: {cls: "mitjans_subsistencia",	name: _("mitjans_subsistencia")},
      44: {cls: "globalitzacio", name: _("globalitzacio")},
      45: {cls: "exercit", name: _("exercit")},
      46: {cls: "desplaçaments", name: _("desplaçaments")},
      47: {cls: "desarrelament", name: _("desarrelament"), isFinal: true},
      48: {cls: "transnacional", name: _("transnacional")},
      49: {cls: "espoli", name: _("espoli")},
      50: {cls: "empobriment", name: _("empobriment")},
      51: {cls: "lobby_de_poder", name: _("lobby_de_poder")},
      52: {cls: "desigualtat_economica", name: _("desigualtat_economica")},
      53: {cls: "precarietat_laboral", name: _("precarietat_laboral"), isFinal: true},
      54: {cls: "protesta_social", name: _("protesta_social")},
      55: {cls: "criminalitzacio", name: _("criminalitzacio")},
      56: {cls: "revolta_social", name: _("revolta_social")},
      57: {cls: "conflictes_armats", name: _("conflictes_armats"), isFinal: true},
      58: {cls: "comerç_darmes", name: _("comerç_darmes"), isFinal: true},
      59: {cls: "militaritzacio", name: _("militaritzacio"), isFinal: true},
      60: {cls: "seguretat_privada", name: _("seguretat_privada")},
      61: {cls: "espionatge", name: _("espionatge"), isFinal: true},
      62: {cls: "violacio_DDHH", name: _("violacio_DDHH"), isFinal: true}
    };

    $("#elts-grid-two .elts-list .elt").each(function() {
      var eltIndex = $(this).data("elt");
      var newText = esfab.ingredientList[eltIndex].name;
      $(this).text(newText);
    });

  };

  //!Game flow helper methods

  esfab.markSelectedItem = function(elt) {
    elt.toggleClass("selected");
    var targetIngredient;
    if (esfab.fsm.is('TwoSelected')) {
      targetIngredient = $("#second-ingredient");
    } else {
      targetIngredient = $("#first-ingredient");
    }
    targetIngredient.removeClass().addClass(elt.attr("class"));
    targetIngredient.children('.label').text(elt.text());
    esfab.selectedItems.push(elt);
  };

  esfab.releaseSelectedItem = function(elt) {
    var allClasses = elt.attr("class").split(' ');
    var eltClass = '';
    $.each(allClasses, function(i,cls) {
        cls = $.trim(cls);
        if (cls.indexOf('elt-') == 0)
          eltClass = cls;
    });
    if (!eltClass)
      return;

    var selector = "#mix-zone ." + eltClass;
    $(selector + " .label").text('');
    $(selector).removeClass().addClass("elt");
    esfab.selectedItems.shift();
  };

  esfab.clearGrids = function() {
    $('.elts-grid .elts-list').children().remove();
  };
  
  // _XAVI: neteja la graella d'elements finals
  esfab.clearGridOne = function() {
    $('#elts-grid-one .elts-list').children().remove();
  };

  esfab.addIngredientToMainGrid = function(ingIndex, recalc) {
    var ingObj = esfab.ingredientList[ingIndex];
    $('#elts-grid-two .elts-list').append(
      '<li class="elt elt-'+ingObj.cls+'" data-elt="' +
        ingIndex+'">' +
        ingObj.name+'</li>'
    );
    if (recalc) {
      var newElt = $("#elts-grid-two .elt-"+ingObj.cls);
      var partiallyHidden = false;
      esfab.updateScrollers(partiallyHidden);
    }
  };

  esfab.addIngredientToSecondaryGrid = function(ingIndex, recalc) {
    var ingObj = esfab.ingredientList[ingIndex];
    var theList = $('#elts-grid-one .elts-list');
    theList.append(
      '<li class="elt elt-'+ingObj.cls+'" data-elt="' +
        ingIndex+'">' +
        ingObj.name+'</li>'
    );
    theList.width(theList.children().length * (theList.children().first().outerWidth() + 6));
    if (recalc) {
      esfab.updateScrollers(false);
    }
  };

  // Comprova si una mescla té resultat
  esfab.checkMix = function() {
    var indexOne 	= esfab.selectedItems[0].data("elt");
    var indexTwo 	= esfab.selectedItems[1].data("elt");
    var mix           = esfab.ingredientList[indexOne].cls + '+' + esfab.ingredientList[indexTwo].cls;
    var mix_reverse   = esfab.ingredientList[indexTwo].cls + '+' + esfab.ingredientList[indexOne].cls;
    var mix_result_id = esfab.mixTable[mix] || esfab.mixTable[mix_reverse];

    if (mix_result_id && $.inArray(mix_result_id, esfab.unlockedIngredients) >= 0) {
      esfab.showFloatingMessage(_("Ja has jugat aquesta combinació"));
      esfab.fsm.NoMix();
    } else if (mix_result_id) {
      esfab.fsm.MixSuccess(mix_result_id);
    } else {
      esfab.fsm.NoMix();
    }
  };

  esfab.showOrHideMenu = function() {
    $("#main-menu").toggleClass("active");
  };

  // Només text, desapareix sol segons esfab.messageReadingTime()
  esfab.showFloatingMessage = function(msg) {
    $("#info-msg > .container").html(msg).css("margin", "0").parent().removeClass("info-panel").
      css('margin', Math.round(($(window).height() - $("#info-msg").outerHeight())/2)+'px 5% auto').
      fadeIn('medium', function() {
        esfab.updateScrollers();
        setTimeout(
          function() {
            var currentPanelText = $("#info-msg .container").html();
            if (currentPanelText === msg) {
              esfab.dismissFloatingMessage();
            }
          }, esfab.messageReadingTime($("#info-msg").text().length)
        );
        }
      );
    if (esfab.paneliScroll == null) {
      esfab.paneliScroll = new iScroll('info-msg',
        { hScroll: false, vScrollbar: true, hideScrollbar: false, fadeScrollbar: false }
      );
    } else {
      esfab.updateScrollers();
    }
  };

  // Text i opcionalment link amb info. Amagat per l'usuari
  esfab.showFloatingPanel = function(title, text, url, urlText) {
    $("#main-menu").removeClass("active");

    var panelContent =  '<h2>' + title + '</h2>' +
                        '<p>' + text + '</p>' +
                        '<a href="#" id="dismiss-panel">'+_("OK")+'</a>';
    if (url && urlText) {
      panelContent += '<a href="#" onclick="esfab.openLinkInBrowser(\''+url+'\');return false;">'+urlText+'</a>';
    }
    $("#info-msg").css('margin', 'inherit').addClass('info-panel').
      children(".container").html(panelContent).parent().fadeIn('medium');
    $("#info-msg .container").css('margin',
       Math.floor(($("#info-msg").innerHeight() - $("#info-msg > .container").outerHeight())/2)+'px' + ' 5%');
    if (esfab.paneliScroll == null) {
      esfab.paneliScroll = new iScroll('info-msg',
        { hScroll: false, vScrollbar: true, hideScrollbar: false, fadeScrollbar: false }
      );
    } else {
      esfab.updateScrollers();
    }
  };

  // Panell amb opcions. Per exemple per confirmar el reinici del nivell.
  esfab.showConfirmPanel = function(title, text, actionFunctionNameAndParams, actionName) {
    var panelContent =  '<h2>' + title + '</h2>' +
                        '<p>' + text + '</p>' +
                        '<a href="#" id="dismiss-panel">'+_("Cancel·la")+'</a>';
    if (actionName && actionFunctionNameAndParams) {
      panelContent += '<a href="#" onclick="'+actionFunctionNameAndParams+';esfab.dismissFloatingPanel();return false;">'
        +actionName+'</a>';
    }
    $("#info-msg").css('margin', 'inherit').addClass('info-panel').
      children(".container").html(panelContent).parent().fadeIn('medium');
    $("#info-msg .container").css('margin',
       Math.floor(($("#info-msg").innerHeight() - $("#info-msg > .container").outerHeight())/2)+'px' + ' 5%');
    if (esfab.paneliScroll == null) {
      esfab.paneliScroll = new iScroll('info-msg',
        { hScroll: false, vScrollbar: true, hideScrollbar: false, fadeScrollbar: false }
      );
    } else {
      esfab.updateScrollers();
    }
  };

  esfab.dismissFloatingPanel = function() {
    $("#info-msg").fadeOut('fast', function() {
        $("#info-msg").css('margin', 'inherit').removeClass('info-panel').children(".container").html('');
    });
  };

  esfab.dismissFloatingMessage = function() {
    $("#info-msg").fadeOut('fast', function(){
      $("#info-msg > .container").text('').parent().css('margin', 'inherit');
    });
  };

  // _system crida el plugin de Cordova que s'integra amb el navegador nadiu.
  esfab.openLinkInBrowser = function(linkURL) {
    return window.open(linkURL, "_system");
  }

  // Escriptura a LocalStorage.
  // Desem només índexs separats per comes, mai nom d'ingredients
  esfab.saveGameState = function() {
    if (!Modernizr.localstorage) { return false; }
    localStorage["esfab.currentLevel"] = esfab.currentLevel;
    
    if (esfab.unlockedIngredients.length > 0) {
      localStorage["esfab.unlockedIngredients"] = esfab.unlockedIngredients.join();
    } else {
      localStorage["esfab.unlockedIngredients"] = "";
    }
    
    if (esfab.gridIngredients.length > 0) {
      localStorage["esfab.gridIngredients"] = esfab.gridIngredients.join();
    } else {
      localStorage["esfab.gridIngredients"] = "";
    }

    return true;
  }

  // Lectura de LocalStorage
  // Tot són Strings per tant hem de passar a int
  esfab.loadGameState = function() {
    if (!Modernizr.localstorage) { return false; }

    esfab.currentLevel = localStorage["esfab.currentLevel"] || esfab.currentLevel;
    var tmpUnlocked = localStorage["esfab.unlockedIngredients"];
    var tmpGrid = localStorage["esfab.gridIngredients"];
    
    if (tmpUnlocked) {
      tmpUnlocked = tmpUnlocked.split(',');
      $.each(tmpUnlocked, function(i,num) {
        tmpUnlocked[i] = parseInt(num, 10);
      });
      esfab.unlockedIngredients = tmpUnlocked;
    }
    
    if (tmpGrid) {
      tmpGrid = tmpGrid.split(',');
      $.each(tmpGrid, function(i,num) {
        tmpGrid[i] = parseInt(num, 10);
      });
	  esfab.gridIngredients = tmpGrid;
    }
    return true;
  }

  //!State Machine and callbacks. Read the docs:
  // https://github.com/jakesgordon/javascript-state-machine
  esfab.fsm.onbeforeevent = function(evt, from, to) {
    //console.log(">>>> " + evt + ": " + from + " --> " + to);
  };
  esfab.fsm.onenterstate = function(evt, from, to) {
    //console.log(">>>> Entering state" + to);
  };


  esfab.fsm.onLoaded = function(evt, from, to) {
    setTimeout(function() {
      try {
        //console.log("Hiding splash");
        navigator.splashscreen.hide(); // cordova plugin
      }
      catch (e) {
        //console.log("Apparently splash screen wasn't visible");
      }
    }, 4*esfab.animationDelay);

  };


  esfab.fsm.onBase = function(evt, from, to) {
    $("#mix-result .label").text('');
    $("#mix-result").removeClass().addClass("elt");
    while(esfab.selectedItems.length > 0) {
      esfab.releaseSelectedItem(esfab.selectedItems[0]);
    }
  };

  esfab.fsm.onSelectOne = function(evt, from, to, elt) {
    if (from === 'OneSelected' && esfab.selectedItems.length) {
      esfab.releaseSelectedItem(esfab.selectedItems[0]);
    }
    esfab.markSelectedItem(elt);
  };

  esfab.fsm.onUnselectOne = function(evt, from, to, elt) {
    if (from === 'OneSelected' && esfab.selectedItems.length) {
      esfab.releaseSelectedItem(esfab.selectedItems[0]);
    }
  };

  esfab.fsm.onTwoSelected = function(evt, from, to, elt) {
    esfab.markSelectedItem(elt);
    setTimeout(esfab.checkMix, 2*esfab.animationDelay);
  };

  esfab.fsm.onMixSuccess = function(evt, from, to, mix_result_id) {
    var mix_result = esfab.ingredientList[mix_result_id];
    //console.log("we have a new ingredient: " +  mix_result.name);
    esfab.unlockedIngredients.push(mix_result_id);
    console.log(esfab.gridIngredients);
    esfab.gridIngredients.push(mix_result_id);
    console.log(esfab.gridIngredients);
    esfab.addIngredientToMainGrid(mix_result_id, true);
    if (mix_result.hasOwnProperty("isFinal") && mix_result.isFinal) {
      esfab.addIngredientToSecondaryGrid(mix_result_id, true);
    }
    $("#mix-result").addClass("elt-"+mix_result.cls);
    $("#mix-result .label").text(mix_result.name);
    var msgToShow = "<strong>" + mix_result.name + "</strong>";
    if (mix_result.hasOwnProperty("desc")) {
      msgToShow += ": " + mix_result.desc;
    }
    esfab.showFloatingMessage(_("Has desbloquejat") + '<br>' + msgToShow);
    esfab.saveGameState();
    setTimeout( function() {
      esfab.fsm.UnlockingRevealed(mix_result_id);
    }, 4*esfab.animationDelay);
  };

  // Element desbloquejat: cal passar de nivell?
  esfab.fsm.onleaveItemUnlocked = function(evt, from, to, mix_result_id) {

    if (evt == 'NewLevel') {
      return; //been here before
    }

    var newLevel = false;

    if (esfab.endOfLevelCondition[esfab.currentLevel]['type'] === 'NUM_UNLOCKED' &&
        esfab.unlockedIngredients.length == esfab.endOfLevelCondition[esfab.currentLevel]['val']) {
      //console.log("condition of level " + esfab.currentLevel + " reached (# ingredients unlocked)");
      newLevel = true;
    } else if (esfab.endOfLevelCondition[esfab.currentLevel]['type'] === 'ITEM_UNLOCKED' &&
        mix_result_id == esfab.endOfLevelCondition[esfab.currentLevel]['val']) {
      //console.log("condition of level " + esfab.currentLevel + " reached (special ingredient unlocked)");
      newLevel = true;
    } else if (esfab.endOfLevelCondition[esfab.currentLevel]['type'] === 'ITEM_COLLECTION_UNLOCKED' &&
      $("#elts-grid-one .elt").length == esfab.endOfLevelCondition[esfab.currentLevel]['val'].length) {
      var condition = esfab.endOfLevelCondition[esfab.currentLevel]['val'];
      var itemsUnlocked = 0;
      for (var j = 0; j < condition.length; j++) {
        if (esfab.unlockedIngredients.indexOf(condition[j]) >= 0) {
          itemsUnlocked++;
        }
      }
      if (itemsUnlocked == condition.length) {
        newLevel = true;
        //console.log("condition of level " + esfab.currentLevel + " reached (list of ingredients unlocked)");
      }
    } else {
      //console.log("not yet EOL");
    }

    if (newLevel) {
      setTimeout(function() {
          esfab.fsm.NewLevel();
      }, esfab.superSlowMsgAutoDismissTimeout);
      return false; // cancel transition to base state to go to new level
    }
  };

  // Nou nivell...
  esfab.fsm.onNewLevel = function(evt, from, to) {
    // if (esfab.currentLevel == 1) {
    //  esfab.showEOLMsg(1);
    // }
    esfab.showEOLMsg(esfab.currentLevel);
    esfab.currentLevel++;
    // esfab.clearGridOne();
    esfab.fillMenuOptions();
/*	if (esfab.currentLevel > 1) {
		esfab.startingIngredients[esfab.currentLevel] = esfab.startingIngredients[esfab.currentLevel-1].concat(esfab.unlockedIngredients.concat(esfab.startingIngredients[esfab.currentLevel]));
	} */
	if (esfab.currentLevel == 2) {
		esfab.gridIngredients = esfab.gridIngredients.concat(esfab.startingIngredients[2]);
		esfab.startingIngredients[2] = esfab.startingIngredients[1].concat(esfab.unlockedIngredients.concat(esfab.startingIngredients[esfab.currentLevel]));
		
	}
    // La definició de startingIngredients[i] és el que marca
    // l'existència del nivell i
    if (esfab.startingIngredients.hasOwnProperty(esfab.currentLevel)) {
      esfab.setupLevel();
    }
        // esfab.clearGridOne();
        
    // Per tenir final de nivell:

//    else {
//      esfab.showFloatingPanel(
//        _('Joc superat'),
//        _('Missatge de final de joc'),
//        _('URL final de joc'), _('Més info'));
//    }
    esfab.saveGameState();
  }

  // Missatge de final de nivell
  // Es podria tenir un array d'objectes amb títol, desc, url
  // o simplement expandir amb switch/if-else
  esfab.showEOLMsg = function(level) {

    if (level == 1) {
      esfab.showFloatingPanel(
        _('Nivell superat'),
        _('Missatge de primer nivell superat'),
        _('URL 1r nivell superat'), _('Més info'));
    }
    // XAVI
    else if (level == 2) {
	  esfab.showFloatingPanel(
        _('Nivell superat'),
        _('Missatge de segon nivell superat'),
        _('URL 2n nivell superat'), _('Més info'));		
	}

  };

  //!Utilities and shims
  function _(key) {
    return esfab.i18n.dgettext("esf", key);
  };

  function _n(skey, plkey, num) {
    return esfab.i18n.dgettext("esf", skey, plkey, num);
  };

  esfab.loadScript = function(scriptUrl, scriptId, successHandler, errorHandler) {
    var head = document.getElementsByTagName("head")[0];
    script = document.createElement('script');
    script.type = 'text/javascript';
    script.id = scriptId;
    script.src = scriptUrl;
    script.onload = successHandler;
    script.onerror = errorHandler;
    head.appendChild(script);
  };

  esfab.updateScrollers = function(scrollToLastElement) {

    setTimeout(function () {
      if (esfab.grid1iScroll != null) {
    		esfab.grid1iScroll.refresh();
      }
      if (esfab.grid2iScroll != null) {
    		esfab.grid2iScroll.refresh();
      }
      if (scrollToLastElement === true) {
        esfab.grid2iScroll.scrollToElement('#elts-grid-two > .elts-list > li:last-child');
      }
      if (esfab.paneliScroll != null) {
        esfab.paneliScroll.refresh();
      }
  	}, 0); // from iscroll docs
  };

  // Modificar per a ajustar el temps que es mostren missatges de diversa longitud
  // Es pot canviar la variable de temps o la longitud per a tenir trams diferents.
  // També es pot fer totalment proporcional.
  esfab.messageReadingTime = function(len) {
    if (!len || len < 20)
      return esfab.quickMsgAutoDismissTimeout;

    if (len > 100)
      return esfab.superSlowMsgAutoDismissTimeout;

    return esfab.slowMsgAutoDismissTimeout;
  };

  //!Runtime => punt d'entrada des de l'HTML
  esfab.init = function(argObj) {
    if (argObj && argObj.hasOwnProperty("cordova") && argObj.cordova) {
      // esperem a Cordova
      document.addEventListener('deviceready', esfab.startLoading, false);
    } else {
      // Comencem amb document.ready
      $(document).ready(function() {
        if (!Modernizr.localstorage) {
          alert("Compte! El teu navegador no permetrà desar la partida.");
        }
        esfab.startLoading();
      });
    }
  }
})( jQuery );
