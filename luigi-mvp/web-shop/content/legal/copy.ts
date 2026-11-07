import type { Locale } from "../../i18n/config";
import type { CopyDocument } from "../copy/types";

export type LegalKind = "agbs" | "privacy" | "imprint";

type LegalBundle = Record<LegalKind, CopyDocument>;

const de: LegalBundle = {
  agbs: {
    intro:
      "Diese Bedingungen gehören zu einem Entwicklungsprojekt. Sie sind kein Vertrag mit einem Veloverleih, weil hier keiner betrieben wird.",
    sections: [
      {
        id: "agb-what",
        title: "Was diese Seite ist",
        paragraphs: [
          "Diese Website ist ein Entwicklungs- und Demonstrationsprojekt für eine White-Label-Software zum Vermieten. Sie ist kein Fahrradverleih, kein Online-Shop und kein Angebot, einen Mietvertrag abzuschliessen.",
        ],
      },
      {
        id: "agb-contract",
        title: "Kein Vertrag",
        paragraphs: [
          "Warenkorb, Konto, Reservierung und Kontaktformular begründen keinen Vertrag, keine Reservierung und keine Pflicht, Velos, Zubehör oder andere Leistungen zu erbringen. Es liegt kein Angebot vor, und nichts davon wird angenommen.",
        ],
      },
      {
        id: "agb-payment",
        title: "Keine Zahlungen",
        paragraphs: [
          "Preise, Kasse, Rechnungen und Zahlungsschritte sind simuliert. Es wird kein Geld eingezogen. Es entsteht keine Zahlungsforderung und kein Anspruch auf eine Leistung.",
        ],
      },
      {
        id: "agb-data",
        title: "Beispieldaten",
        paragraphs: [
          "Produkte, Standorte, Verfügbarkeit, Namen und Preise sind Beispieldaten für die Entwicklung. Sie können falsch, unvollständig oder veraltet sein und sich ohne Ankündigung ändern. Plane keine Reise danach.",
        ],
      },
      {
        id: "agb-asis",
        title: "Nutzung auf eigene Gefahr",
        paragraphs: [
          "Die Software wird so bereitgestellt, wie sie im aktuellen Entwicklungsstand ist. Verfügbarkeit, Richtigkeit und Eignung für einen echten Verleih werden nicht zugesichert.",
        ],
      },
      {
        id: "agb-liability",
        title: "Haftung",
        paragraphs: [
          "Soweit gesetzlich zulässig, ist die Haftung der Personen, die dieses Projekt entwickeln oder diese Demo betreiben, für Schäden aus der Nutzung ausgeschlossen. Das gilt insbesondere für vergebliche Aufwände, falsche Angaben, ausgefallene Funktionen und Daten, die in Formulare eingegeben werden.",
          "Zwingende Haftung, etwa für Vorsatz oder grobe Fahrlässigkeit sowie für die Verletzung von Leben, Körper oder Gesundheit, bleibt unberührt. Weil hier kein echter Verleih betrieben wird, darfst du dich auf diese Website nicht für Buchungen oder Reisepläne verlassen.",
        ],
      },
      {
        id: "agb-contact",
        title: "Kontaktformular",
        paragraphs: [
          "Das Kontaktformular speichert und versendet die Eingaben in dieser Version nicht. Es erscheint nur eine Bestätigung im Browser. Übermittle keine vertraulichen Angaben und keine besonderen Personendaten.",
        ],
      },
      {
        id: "agb-changes",
        title: "Änderungen und Recht",
        paragraphs: [
          "Diese Bedingungen sind ein Platzhalter für einen späteren, echten Betreiber. Sie können sich jederzeit ändern, weil das Projekt nicht fertig ist. Massgebend ist die Fassung, die beim Besuch angezeigt wird.",
          "Sie schaffen keinen Konsumvertrag mit der entwickelnden Person. Soweit im Zusammenhang mit der Nutzung der Demo überhaupt ein Rechtsverhältnis entsteht, gilt Schweizer Recht. Zwingende Gerichtsstände bleiben vorbehalten.",
        ],
      },
    ],
  },
  privacy: {
    intro:
      "Diese Erklärung gehört zu einem Entwicklungsprojekt, nicht zu einem kommerziellen Verleih. Gib hier keine echten Personendaten ein, die du nicht in einer Demo sehen willst.",
    sections: [
      {
        id: "privacy-controller",
        title: "Verantwortliche Stelle",
        paragraphs: [
          "Es gibt kein Unternehmen, das diese Website als Verleih betreibt. Eine verantwortliche Stelle im Sinne eines produktiven Angebots ist nicht benannt, weil keines besteht. Die Seite dient der Softwareentwicklung.",
        ],
      },
      {
        id: "privacy-contact",
        title: "Kontaktformular",
        paragraphs: [
          "E-Mail, Telefonnummer und Nachricht werden beim Absenden nicht an einen Server geschickt und nicht gespeichert. Die Eingaben bleiben im Browser, bis du die Seite verlässt oder neu lädst. Die Dankesmeldung bedeutet nicht, dass jemand die Nachricht erhalten hat.",
        ],
      },
      {
        id: "privacy-account",
        title: "Konto, Warenkorb, Reservierung",
        paragraphs: [
          "Wenn du ein Konto anlegst oder eine Reservierung durchspielst, kann die angebundene Entwicklungsschnittstelle Angaben wie Name, E-Mail, Telefonnummer und Reservierungsdaten in der Datenbank dieser Installation speichern. Das ist Testdatenhaltung für die Software, kein Kundenservice.",
          "Es gibt keinen Newsletter und keinen Verkauf dieser Daten.",
        ],
      },
      {
        id: "privacy-cookies",
        title: "Cookies",
        paragraphs: [
          "Die Seite setzt ein Cookie für die gewählte Sprache sowie Cookies für die Sitzung und den Gast-Warenkorb. Sie dienen dem Betrieb der Demo. Es ist kein Analyse- oder Werbedienst eingebunden.",
        ],
      },
      {
        id: "privacy-sharing",
        title: "Weitergabe",
        paragraphs: [
          "Eine Weitergabe zu Werbezwecken findet nicht statt. Was eine Installation technisch speichert, liegt auf der Infrastruktur, auf der diese Demo gerade läuft. Das kann ein lokaler Rechner sein.",
        ],
      },
      {
        id: "privacy-rights",
        title: "Deine Rechte",
        paragraphs: [
          "Auskunft, Berichtigung und Löschung kannst du nur dort verlangen, wo tatsächlich Daten liegen. Das Kontaktformular erzeugt keinen Datensatz. Für Konten und Reservierungen in einer konkreten Installation wende dich an die Person, die diese Installation betreibt.",
          "Diese Erklärung ersetzt nicht die Datenschutzerklärung eines späteren echten Betreibers.",
        ],
      },
    ],
  },
  imprint: {
    intro:
      "Dieses Impressum sagt, wer hier nicht auftritt: kein Veloverleih, kein Shop, kein eingetragenes Unternehmen.",
    sections: [
      {
        id: "imprint-project",
        title: "Projekt",
        paragraphs: [
          "Luigi ist ein White-Label-Projekt für Mietsoftware. Der sichtbare Shop ist die Demooberfläche, kein Geschäftsbetrieb.",
        ],
      },
      {
        id: "imprint-business",
        title: "Kein Geschäftsbetrieb",
        paragraphs: [
          "Es wird kein Gewerbe, kein Verleih und kein Onlinehandel betrieben. Dieser Text ist kein Impressum eines eingetragenen Unternehmens und ersetzt ein solches nicht, sobald jemand die Software produktiv einsetzt.",
        ],
      },
      {
        id: "imprint-responsible",
        title: "Verantwortlich für den Demo-Inhalt",
        paragraphs: [
          "Verantwortlich für den Beispielinhalt ist die Person, die diese Software entwickelt. Eine ladungsfähige Geschäftsadresse wird nicht angegeben, weil kein Unternehmen auftritt.",
        ],
      },
      {
        id: "imprint-contact",
        title: "Kontakt",
        paragraphs: [
          "Eine erreichbare Kontaktstelle ist noch nicht angebunden. Das Formular unter Kontakt nimmt Eingaben entgegen und versendet sie nicht.",
        ],
      },
      {
        id: "imprint-liability",
        title: "Haftung für Inhalte und Links",
        paragraphs: [
          "Katalog, Preise, Standorte und Rechtstexte sind Platzhalter. Für ihre Richtigkeit, Vollständigkeit und Aktualität wird keine Gewähr übernommen.",
          "Links, etwa zu Karten, führen auf fremde Seiten. Für deren Inhalt ist der jeweilige Betreiber verantwortlich.",
        ],
      },
      {
        id: "imprint-copyright",
        title: "Urheberrecht",
        paragraphs: [
          "Texte und Oberfläche gehören zum Entwicklungsprojekt. Produktbilder können Platzhalter sein.",
        ],
      },
    ],
  },
};

const en: LegalBundle = {
  agbs: {
    intro:
      "These terms belong to a development project. They are not a contract with a bike rental, because none is being operated here.",
    sections: [
      {
        id: "agb-what",
        title: "What this site is",
        paragraphs: [
          "This website is a development and demonstration project for white-label rental software. It is not a bike rental, not an online shop, and not an offer to conclude a rental contract.",
        ],
      },
      {
        id: "agb-contract",
        title: "No contract",
        paragraphs: [
          "A cart, an account, a reservation, or the contact form does not create a contract, a booking, or any duty to provide bikes, accessories, or any other service. There is no offer, and nothing is accepted.",
        ],
      },
      {
        id: "agb-payment",
        title: "No payments",
        paragraphs: [
          "Prices, checkout, invoices, and payment steps are simulated. No money is collected. No claim for payment arises, and no claim to a service arises.",
        ],
      },
      {
        id: "agb-data",
        title: "Sample data",
        paragraphs: [
          "Products, locations, availability, names, and prices are sample data for development. They may be wrong, incomplete, or out of date, and they may change without notice. Do not plan a trip around them.",
        ],
      },
      {
        id: "agb-asis",
        title: "Use at your own risk",
        paragraphs: [
          "The software is provided as it stands in the current development state. Availability, accuracy, and fitness for a real rental business are not promised.",
        ],
      },
      {
        id: "agb-liability",
        title: "Liability",
        paragraphs: [
          "To the extent permitted by law, the people who develop this project or run this demo are not liable for damage arising from its use. That includes wasted effort, wrong information, broken features, and data entered into forms.",
          "Liability that cannot legally be excluded, including for intent or gross negligence and for injury to life, body, or health, remains in place. Because no real rental is operated here, do not rely on this website for bookings or travel plans.",
        ],
      },
      {
        id: "agb-contact",
        title: "Contact form",
        paragraphs: [
          "In this version the contact form does not store or send what you type. The browser only shows a confirmation. Do not submit confidential information or special categories of personal data.",
        ],
      },
      {
        id: "agb-changes",
        title: "Changes and law",
        paragraphs: [
          "These terms are a placeholder for a later, real operator. They can change at any time because the project is unfinished. The version shown when you visit applies.",
          "They do not create a consumer contract with the person developing the software. If any legal relationship arises at all from using the demo, Swiss law applies. Mandatory venues remain reserved.",
        ],
      },
    ],
  },
  privacy: {
    intro:
      "This notice belongs to a development project, not to a commercial rental. Do not enter real personal data you would not want to see in a demo.",
    sections: [
      {
        id: "privacy-controller",
        title: "Who is responsible",
        paragraphs: [
          "No company operates this website as a rental business. A controller in the sense of a production service is not named, because there is no such service. The site exists to develop the software.",
        ],
      },
      {
        id: "privacy-contact",
        title: "Contact form",
        paragraphs: [
          "Email, phone number, and message are not sent to a server and are not stored when you submit the form. They stay in the browser until you leave or reload the page. The thank-you note does not mean anyone received the message.",
        ],
      },
      {
        id: "privacy-account",
        title: "Account, cart, reservation",
        paragraphs: [
          "If you create an account or walk through a reservation, the connected development API may store details such as name, email, phone number, and reservation data in the database of that installation. That is test storage for the software, not customer service.",
          "There is no newsletter and no sale of this data.",
        ],
      },
      {
        id: "privacy-cookies",
        title: "Cookies",
        paragraphs: [
          "The site sets a cookie for the chosen language and cookies for the session and the guest cart. They keep the demo running. No analytics or advertising service is included.",
        ],
      },
      {
        id: "privacy-sharing",
        title: "Sharing",
        paragraphs: [
          "Data is not shared for advertising. Anything an installation stores technically sits on the infrastructure where that demo is running. That can be a local machine.",
        ],
      },
      {
        id: "privacy-rights",
        title: "Your rights",
        paragraphs: [
          "Access, correction, and deletion can only be asked for where data actually exists. The contact form creates no record. For accounts and reservations on a specific installation, contact the person running that installation.",
          "This notice does not replace the privacy notice of a later, real operator.",
        ],
      },
    ],
  },
  imprint: {
    intro:
      "This legal notice says who is not appearing here: no bike rental, no shop, no registered company.",
    sections: [
      {
        id: "imprint-project",
        title: "Project",
        paragraphs: [
          "Luigi is a white-label project for rental software. The shop you see is the demo interface, not a business.",
        ],
      },
      {
        id: "imprint-business",
        title: "No business",
        paragraphs: [
          "No trade, no rental, and no online retail is operated. This text is not the legal notice of a registered company, and it does not replace one once someone uses the software in production.",
        ],
      },
      {
        id: "imprint-responsible",
        title: "Responsible for the demo content",
        paragraphs: [
          "The person developing this software is responsible for the sample content. A serviceable business address is not published, because no company is appearing.",
        ],
      },
      {
        id: "imprint-contact",
        title: "Contact",
        paragraphs: [
          "A reachable contact channel is not connected yet. The form on the contact page accepts input and does not send it.",
        ],
      },
      {
        id: "imprint-liability",
        title: "Content and links",
        paragraphs: [
          "The catalog, prices, locations, and legal texts are placeholders. No warranty is given for their accuracy, completeness, or currency.",
          "Links, including map links, lead to third-party pages. Their operators are responsible for that content.",
        ],
      },
      {
        id: "imprint-copyright",
        title: "Copyright",
        paragraphs: [
          "The copy and the interface belong to the development project. Product images may be placeholders.",
        ],
      },
    ],
  },
};

const fr: LegalBundle = {
  agbs: {
    intro:
      "Ces conditions appartiennent à un projet de développement. Ce n’est pas un contrat avec un loueur de vélos, parce qu’aucun n’est exploité ici.",
    sections: [
      {
        id: "agb-what",
        title: "Ce qu’est ce site",
        paragraphs: [
          "Ce site est un projet de développement et de démonstration pour un logiciel de location en marque blanche. Ce n’est pas un loueur de vélos, pas une boutique en ligne, et pas une offre de conclure un contrat de location.",
        ],
      },
      {
        id: "agb-contract",
        title: "Aucun contrat",
        paragraphs: [
          "Un panier, un compte, une réservation ou le formulaire de contact ne crée ni contrat, ni réservation, ni obligation de fournir des vélos, des accessoires ou un autre service. Il n’y a pas d’offre, et rien n’est accepté.",
        ],
      },
      {
        id: "agb-payment",
        title: "Aucun paiement",
        paragraphs: [
          "Les prix, le paiement, les factures et les étapes de règlement sont simulés. Aucun argent n’est encaissé. Aucune créance de paiement et aucun droit à une prestation ne naissent.",
        ],
      },
      {
        id: "agb-data",
        title: "Données d’exemple",
        paragraphs: [
          "Produits, lieux, disponibilité, noms et prix sont des données d’exemple pour le développement. Ils peuvent être faux, incomplets ou dépassés, et changer sans préavis. N’organisez pas un voyage en fonction d’eux.",
        ],
      },
      {
        id: "agb-asis",
        title: "Utilisation à vos risques",
        paragraphs: [
          "Le logiciel est fourni dans son état de développement actuel. La disponibilité, l’exactitude et l’aptitude à un vrai commerce de location ne sont pas promises.",
        ],
      },
      {
        id: "agb-liability",
        title: "Responsabilité",
        paragraphs: [
          "Dans les limites autorisées par la loi, les personnes qui développent ce projet ou font tourner cette démo ne sont pas responsables des dommages liés à son utilisation. Cela comprend les démarches inutiles, les informations fausses, les fonctions en panne et les données saisies dans les formulaires.",
          "La responsabilité qui ne peut pas être exclue, notamment en cas de dol ou de négligence grave et en cas d’atteinte à la vie, au corps ou à la santé, reste réservée. Comme aucun vrai loueur n’est exploité ici, ne vous fiez pas à ce site pour des réservations ou des voyages.",
        ],
      },
      {
        id: "agb-contact",
        title: "Formulaire de contact",
        paragraphs: [
          "Dans cette version, le formulaire de contact n’enregistre et n’envoie pas ce que vous saisissez. Le navigateur affiche seulement une confirmation. N’envoyez pas d’informations confidentielles ni de données personnelles sensibles.",
        ],
      },
      {
        id: "agb-changes",
        title: "Modifications et droit",
        paragraphs: [
          "Ces conditions sont un texte provisoire pour un futur exploitant réel. Elles peuvent changer à tout moment, parce que le projet n’est pas terminé. La version affichée lors de la visite fait foi.",
          "Elles ne créent pas de contrat de consommation avec la personne qui développe le logiciel. Si un rapport juridique naît malgré tout de l’usage de la démo, le droit suisse s’applique. Les fors impératifs restent réservés.",
        ],
      },
    ],
  },
  privacy: {
    intro:
      "Cette notice appartient à un projet de développement, pas à un loueur commercial. N’indiquez pas de vraies données personnelles que vous ne voudriez pas voir dans une démo.",
    sections: [
      {
        id: "privacy-controller",
        title: "Responsable",
        paragraphs: [
          "Aucune entreprise n’exploite ce site comme un commerce de location. Un responsable au sens d’un service en production n’est pas désigné, parce qu’un tel service n’existe pas. Le site sert à développer le logiciel.",
        ],
      },
      {
        id: "privacy-contact",
        title: "Formulaire de contact",
        paragraphs: [
          "L’e-mail, le numéro de téléphone et le message ne sont pas envoyés à un serveur et ne sont pas enregistrés lorsque vous validez le formulaire. Ils restent dans le navigateur jusqu’à ce que vous quittiez ou rechargiez la page. Le message de remerciement ne signifie pas que quelqu’un a reçu le message.",
        ],
      },
      {
        id: "privacy-account",
        title: "Compte, panier, réservation",
        paragraphs: [
          "Si vous créez un compte ou parcourez une réservation, l’interface de développement reliée peut enregistrer des données comme le nom, l’e-mail, le téléphone et la réservation dans la base de cette installation. C’est un stockage de test pour le logiciel, pas un service client.",
          "Il n’y a pas de newsletter et pas de vente de ces données.",
        ],
      },
      {
        id: "privacy-cookies",
        title: "Cookies",
        paragraphs: [
          "Le site place un cookie pour la langue choisie et des cookies pour la session et le panier invité. Ils font fonctionner la démo. Aucun service d’analyse ou de publicité n’est intégré.",
        ],
      },
      {
        id: "privacy-sharing",
        title: "Transmission",
        paragraphs: [
          "Les données ne sont pas transmises à des fins publicitaires. Ce qu’une installation enregistre techniquement se trouve sur l’infrastructure où cette démo tourne. Cela peut être un ordinateur local.",
        ],
      },
      {
        id: "privacy-rights",
        title: "Vos droits",
        paragraphs: [
          "L’accès, la rectification et l’effacement ne peuvent être demandés que là où des données existent vraiment. Le formulaire de contact ne crée aucun enregistrement. Pour les comptes et réservations d’une installation précise, adressez-vous à la personne qui la fait tourner.",
          "Cette notice ne remplace pas la notice de confidentialité d’un futur exploitant réel.",
        ],
      },
    ],
  },
  imprint: {
    intro:
      "Ces mentions disent qui n’apparaît pas ici : pas de loueur de vélos, pas de boutique, pas de société inscrite.",
    sections: [
      {
        id: "imprint-project",
        title: "Projet",
        paragraphs: [
          "Luigi est un projet en marque blanche pour un logiciel de location. La boutique visible est l’interface de démo, pas un commerce.",
        ],
      },
      {
        id: "imprint-business",
        title: "Aucune activité commerciale",
        paragraphs: [
          "Aucune activité commerciale, aucune location et aucune vente en ligne ne sont exercées. Ce texte n’est pas les mentions légales d’une société inscrite, et il ne les remplace pas dès qu’une personne utilise le logiciel en production.",
        ],
      },
      {
        id: "imprint-responsible",
        title: "Responsable du contenu de démo",
        paragraphs: [
          "La personne qui développe ce logiciel est responsable du contenu d’exemple. Une adresse commerciale valable pour notification n’est pas publiée, parce qu’aucune société n’apparaît.",
        ],
      },
      {
        id: "imprint-contact",
        title: "Contact",
        paragraphs: [
          "Un canal de contact joignable n’est pas encore branché. Le formulaire de la page contact accepte une saisie et ne l’envoie pas.",
        ],
      },
      {
        id: "imprint-liability",
        title: "Contenu et liens",
        paragraphs: [
          "Le catalogue, les prix, les lieux et les textes juridiques sont des textes provisoires. Aucune garantie n’est donnée sur leur exactitude, leur exhaustivité ou leur actualité.",
          "Les liens, y compris vers des cartes, mènent vers des pages tierces. Leurs exploitants sont responsables de ce contenu.",
        ],
      },
      {
        id: "imprint-copyright",
        title: "Droits d’auteur",
        paragraphs: [
          "Les textes et l’interface appartiennent au projet de développement. Les images de produits peuvent être des visuels de remplacement.",
        ],
      },
    ],
  },
};

const it: LegalBundle = {
  agbs: {
    intro:
      "Queste condizioni appartengono a un progetto di sviluppo. Non sono un contratto con un noleggio bici, perché qui non ne viene gestito uno.",
    sections: [
      {
        id: "agb-what",
        title: "Che cos’è questo sito",
        paragraphs: [
          "Questo sito è un progetto di sviluppo e dimostrazione per un software di noleggio white-label. Non è un noleggio bici, non è un negozio online e non è un’offerta per concludere un contratto di noleggio.",
        ],
      },
      {
        id: "agb-contract",
        title: "Nessun contratto",
        paragraphs: [
          "Carrello, account, prenotazione e modulo di contatto non creano un contratto, una prenotazione o un obbligo di fornire bici, accessori o altri servizi. Non c’è un’offerta e non viene accettato nulla.",
        ],
      },
      {
        id: "agb-payment",
        title: "Nessun pagamento",
        paragraphs: [
          "Prezzi, cassa, fatture e passaggi di pagamento sono simulati. Non viene incassato denaro. Non nasce alcun credito di pagamento e alcun diritto a una prestazione.",
        ],
      },
      {
        id: "agb-data",
        title: "Dati di esempio",
        paragraphs: [
          "Prodotti, sedi, disponibilità, nomi e prezzi sono dati di esempio per lo sviluppo. Possono essere sbagliati, incompleti o superati e possono cambiare senza preavviso. Non pianificare un viaggio in base a questi dati.",
        ],
      },
      {
        id: "agb-asis",
        title: "Uso a proprio rischio",
        paragraphs: [
          "Il software è fornito nello stato di sviluppo attuale. Disponibilità, esattezza e idoneità a un vero noleggio non sono assicurate.",
        ],
      },
      {
        id: "agb-liability",
        title: "Responsabilità",
        paragraphs: [
          "Nei limiti consentiti dalla legge, le persone che sviluppano questo progetto o fanno girare questa demo non rispondono dei danni derivanti dall’uso. Questo include sforzi inutili, informazioni sbagliate, funzioni non funzionanti e dati inseriti nei moduli.",
          "Resta ferma la responsabilità che non può essere esclusa, in particolare per dolo o colpa grave e per lesioni alla vita, al corpo o alla salute. Poiché qui non viene gestito un vero noleggio, non fare affidamento su questo sito per prenotazioni o viaggi.",
        ],
      },
      {
        id: "agb-contact",
        title: "Modulo di contatto",
        paragraphs: [
          "In questa versione il modulo di contatto non salva e non invia ciò che scrivi. Il browser mostra solo una conferma. Non inviare informazioni riservate o categorie particolari di dati personali.",
        ],
      },
      {
        id: "agb-changes",
        title: "Modifiche e diritto",
        paragraphs: [
          "Queste condizioni sono un testo provvisorio per un futuro gestore reale. Possono cambiare in qualsiasi momento perché il progetto non è finito. Fa fede la versione mostrata al momento della visita.",
          "Non creano un contratto con il consumatore con la persona che sviluppa il software. Se dall’uso della demo nasce comunque un rapporto giuridico, si applica il diritto svizzero. I fori inderogabili restano riservati.",
        ],
      },
    ],
  },
  privacy: {
    intro:
      "Questa informativa appartiene a un progetto di sviluppo, non a un noleggio commerciale. Non inserire dati personali veri che non vorresti vedere in una demo.",
    sections: [
      {
        id: "privacy-controller",
        title: "Titolare",
        paragraphs: [
          "Nessuna azienda gestisce questo sito come un noleggio. Un titolare nel senso di un servizio in produzione non è indicato, perché un tale servizio non esiste. Il sito serve a sviluppare il software.",
        ],
      },
      {
        id: "privacy-contact",
        title: "Modulo di contatto",
        paragraphs: [
          "Email, numero di telefono e messaggio non vengono inviati a un server e non vengono salvati quando invii il modulo. Restano nel browser finché non esci o ricarichi la pagina. Il ringraziamento non significa che qualcuno abbia ricevuto il messaggio.",
        ],
      },
      {
        id: "privacy-account",
        title: "Account, carrello, prenotazione",
        paragraphs: [
          "Se crei un account o percorri una prenotazione, l’API di sviluppo collegata può salvare dati come nome, email, telefono e prenotazione nel database di quell’installazione. È archiviazione di test per il software, non un servizio clienti.",
          "Non c’è una newsletter e non c’è una vendita di questi dati.",
        ],
      },
      {
        id: "privacy-cookies",
        title: "Cookie",
        paragraphs: [
          "Il sito imposta un cookie per la lingua scelta e cookie per la sessione e il carrello ospite. Servono a far funzionare la demo. Non è integrato alcun servizio di analisi o pubblicità.",
        ],
      },
      {
        id: "privacy-sharing",
        title: "Comunicazione",
        paragraphs: [
          "I dati non vengono comunicati per pubblicità. Ciò che un’installazione salva tecnicamente sta sull’infrastruttura dove gira quella demo. Può essere un computer locale.",
        ],
      },
      {
        id: "privacy-rights",
        title: "I tuoi diritti",
        paragraphs: [
          "Accesso, rettifica e cancellazione si possono chiedere solo dove i dati esistono davvero. Il modulo di contatto non crea alcun record. Per account e prenotazioni di un’installazione concreta, rivolgiti a chi la gestisce.",
          "Questa informativa non sostituisce l’informativa privacy di un futuro gestore reale.",
        ],
      },
    ],
  },
  imprint: {
    intro:
      "Queste note legali dicono chi non compare qui: nessun noleggio bici, nessun negozio, nessuna società registrata.",
    sections: [
      {
        id: "imprint-project",
        title: "Progetto",
        paragraphs: [
          "Luigi è un progetto white-label per software di noleggio. Il negozio visibile è l’interfaccia demo, non un’attività.",
        ],
      },
      {
        id: "imprint-business",
        title: "Nessuna attività",
        paragraphs: [
          "Non viene esercitata alcuna attività commerciale, alcun noleggio e alcuna vendita online. Questo testo non è l’impressum di una società registrata e non lo sostituisce quando qualcuno usa il software in produzione.",
        ],
      },
      {
        id: "imprint-responsible",
        title: "Responsabile del contenuto demo",
        paragraphs: [
          "La persona che sviluppa questo software è responsabile del contenuto di esempio. Un indirizzo commerciale valido per notifiche non viene pubblicato, perché non compare alcuna società.",
        ],
      },
      {
        id: "imprint-contact",
        title: "Contatto",
        paragraphs: [
          "Un canale di contatto raggiungibile non è ancora collegato. Il modulo nella pagina contatti accetta i dati e non li invia.",
        ],
      },
      {
        id: "imprint-liability",
        title: "Contenuti e link",
        paragraphs: [
          "Catalogo, prezzi, sedi e testi legali sono segnaposto. Non si garantisce che siano esatti, completi o aggiornati.",
          "I link, anche alle mappe, portano a pagine di terzi. I rispettivi gestori rispondono di quei contenuti.",
        ],
      },
      {
        id: "imprint-copyright",
        title: "Diritto d’autore",
        paragraphs: [
          "Testi e interfaccia appartengono al progetto di sviluppo. Le immagini dei prodotti possono essere segnaposto.",
        ],
      },
    ],
  },
};

export const legalCopy: Record<Locale, LegalBundle> = { de, en, fr, it };
