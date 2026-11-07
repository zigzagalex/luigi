import type { Locale } from "../../i18n/config";
import type { CopyDocument } from "../copy/types";

export const aboutCopy: Record<Locale, CopyDocument> = {
  de: {
    intro:
      "Luigi's sieht aus wie ein Veloverleih. Es ist ein Entwicklungsprojekt. Die Velos haben die Schweiz noch nie gesehen.",
    sections: [
      {
        id: "about-short",
        title: "Die kurze Version",
        paragraphs: [
          "Hier entsteht Software, mit der ein Verleih irgendwann den eigenen Shop betreiben kann. Der Shop, den du gerade anklickst, ist die Demo.",
          "Die Hügel sind nicht im Lieferumfang. Der Warenkorb schon.",
        ],
      },
      {
        id: "about-real",
        title: "Was echt ist",
        paragraphs: [
          "Echt sind die Seiten, die Reservierungsstrecke und das Admin. Unecht ist das Geschäft dahinter.",
          "Niemand wartet mit einem Helm in deiner Grösse hinter einem Tresen. Wenn eine Reservierung offiziell aussieht, macht die Oberfläche ihren Job.",
        ],
      },
      {
        id: "about-prices",
        title: "Was die Preise bedeuten",
        paragraphs: [
          "Preise, Standorte und Bestand sind Beispieldaten, damit man das Produkt durchklicken kann. Sie kaufen dir kein Wochenende am See.",
          "Sie zeigen nur, wie eine Buchung aussehen würde, wenn jemand dieses Projekt wirklich betreiben würde.",
        ],
      },
      {
        id: "about-wip",
        title: "Noch in Arbeit",
        paragraphs: [
          "Ein paar Dinge sind absichtlich noch nicht fertig. Das Kontaktformular nimmt deine Nachricht entgegen und schickt sie nirgendwo hin.",
          "Danke trotzdem. Wir tun so, als hätten wir sie gelesen.",
        ],
      },
    ],
  },
  en: {
    intro:
      "Luigi's looks like a bike rental. It is a development project. The bikes have never met a Swiss hill.",
    sections: [
      {
        id: "about-short",
        title: "The short version",
        paragraphs: [
          "This is software a rental brand could one day use to run its own shop. The shop you are clicking through is the demo.",
          "The hills are not included. The cart is.",
        ],
      },
      {
        id: "about-real",
        title: "What is real",
        paragraphs: [
          "The pages, the reservation flow, and the admin are real software. The business behind them is not.",
          "Nobody is waiting at a counter with a helmet in your size. If a reservation looks official, that is the interface doing its job.",
        ],
      },
      {
        id: "about-prices",
        title: "What the prices mean",
        paragraphs: [
          "Prices, stores, and stock are sample data so the product can be clicked through. They will not buy you a weekend by the lake.",
          "They only show what a booking would look like if someone actually operated this project.",
        ],
      },
      {
        id: "about-wip",
        title: "Still in progress",
        paragraphs: [
          "A few things are unfinished on purpose. The contact form accepts your message and does not send it anywhere.",
          "Thanks anyway. We will pretend we read it.",
        ],
      },
    ],
  },
  fr: {
    intro:
      "Luigi's a l’air d’un loueur de vélos. C’est un projet de développement. Les vélos n’ont jamais vu une côte suisse.",
    sections: [
      {
        id: "about-short",
        title: "La version courte",
        paragraphs: [
          "On construit ici un logiciel qu’un loueur pourra un jour utiliser pour son propre magasin. La boutique que vous cliquez est la démo.",
          "Les cols ne sont pas inclus. Le panier, si.",
        ],
      },
      {
        id: "about-real",
        title: "Ce qui est vrai",
        paragraphs: [
          "Les pages, le parcours de réservation et l’admin sont de vrais logiciels. Le commerce derrière ne l’est pas.",
          "Personne ne vous attend au comptoir avec un casque à votre taille. Si une réservation a l’air officielle, c’est l’interface qui fait son travail.",
        ],
      },
      {
        id: "about-prices",
        title: "Ce que veulent dire les prix",
        paragraphs: [
          "Prix, magasins et stock sont des données d’exemple, pour qu’on puisse cliquer le produit. Ils ne vous offrent pas un week-end au bord du lac.",
          "Ils montrent seulement à quoi ressemblerait une réservation si quelqu’un exploitait vraiment ce projet.",
        ],
      },
      {
        id: "about-wip",
        title: "Encore en cours",
        paragraphs: [
          "Quelques choses restent volontairement inachevées. Le formulaire de contact prend votre message et ne l’envoie nulle part.",
          "Merci quand même. Nous ferons semblant de l’avoir lu.",
        ],
      },
    ],
  },
  it: {
    intro:
      "Luigi's sembra un noleggio bici. È un progetto di sviluppo. Le bici non hanno mai visto una salita svizzera.",
    sections: [
      {
        id: "about-short",
        title: "La versione breve",
        paragraphs: [
          "Qui si costruisce un software con cui un noleggio potrà un giorno gestire il proprio negozio. Il negozio che stai cliccando è la demo.",
          "Le salite non sono incluse. Il carrello sì.",
        ],
      },
      {
        id: "about-real",
        title: "Che cosa è vero",
        paragraphs: [
          "Le pagine, il flusso di prenotazione e l’admin sono software vero. L’attività dietro non lo è.",
          "Nessuno ti aspetta al bancone con un casco della tua misura. Se una prenotazione sembra ufficiale, è l’interfaccia che fa il suo lavoro.",
        ],
      },
      {
        id: "about-prices",
        title: "Che cosa significano i prezzi",
        paragraphs: [
          "Prezzi, sedi e disponibilità sono dati di esempio, così si può provare il prodotto. Non ti comprano un weekend al lago.",
          "Mostrano solo come sarebbe una prenotazione se qualcuno gestisse davvero questo progetto.",
        ],
      },
      {
        id: "about-wip",
        title: "Ancora in corso",
        paragraphs: [
          "Alcune cose sono volutamente incompiute. Il modulo di contatto accetta il messaggio e non lo invia da nessuna parte.",
          "Grazie lo stesso. Faremo finta di averlo letto.",
        ],
      },
    ],
  },
};
