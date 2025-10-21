const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');
const express = require('express');

// ========================================
// 🔐 CONFIGURATION
// ========================================
// const TOKEN = '8280606106:AAGdeWR0Mh9pT-VbhESc0U4zU4i9T1RV4-Q';
const TOKEN = process.env.BOT_TOKEN || '8280606106:AAGdeWR0Mh9pT1U-VbhESc0U4zU4i9T1RV4';

const CHAT_ID = '982047637';

const bot = new TelegramBot(TOKEN, { polling: true });

// Express pour garder Glitch actif
const app = express();
app.get('/', (req, res) => res.send('Bot actif ! ✅'));
app.listen(3000);

// ========================================
// 📅 EMPLOI DU TEMPS
// ========================================
const EDT = [
  {
    id: 1,
    nom: "🌅 Routine matinale",
    description: "Exercice optionnel + Sangou + Dourous (Fawzayni + Djouki)",
    heureDebut: "05:00",
    heureFin: "07:00",
    emoji: "🌅"
  },
  {
    id: 2,
    nom: "🏃‍♂️ Sport",
    description: "Course ou activité physique",
    heureDebut: "18:00",
    heureFin: "19:00",
    emoji: "🏃‍♂️"
  },
  {
    id: 3,
    nom: "🌙 Sangoou + Dourous + Diang",
    description: "Révision, apprentissage Quran, écriture ou récitation",
    heureDebut: "19:00",
    heureFin: "20:00",
    emoji: "🌙"
  },
  {
    id: 4,
    nom: "📖 Sarr Al-Qur'an",
    description: "Lecture / mémorisation selon progression",
    heureDebut: "20:00",
    heureFin: "21:00",
    emoji: "📖"
  },
  {
    id: 5,
    nom: "✨ Khassida",
    description: "Étude des khassidas de la semaine",
    heureDebut: "21:00",
    heureFin: "22:00",
    emoji: "✨"
  },
  {
    id: 6,
    nom: "📚 Cours CE2",
    description: "Cours à l'enfant, max 22h30",
    heureDebut: "22:00",
    heureFin: "22:30",
    emoji: "📚"
  },
  {
    id: 7,
    nom: "💻 Travail/Tâches",
    description: "Tâches ou repos selon planning",
    heureDebut: "22:30",
    heureFin: "23:00",
    emoji: "💻"
  }
];

// ========================================
// 💾 SYSTÈME DE SUIVI (stockage en mémoire)
// ========================================
let statistiques = {
  activitesCompletes: {},
  activitesReportees: {},
  activitesAnnulees: {},
  derniereReinitialisation: new Date().toISOString().split('T')[0]
};

// Réinitialiser les stats chaque jour à minuit
cron.schedule('0 0 * * *', () => {
  const aujourdhui = new Date().toISOString().split('T')[0];
  statistiques.activitesCompletes[aujourdhui] = [];
  statistiques.activitesReportees[aujourdhui] = [];
  statistiques.activitesAnnulees[aujourdhui] = [];
});

// Initialiser le jour actuel si nécessaire
function initialiserJour() {
  const aujourdhui = new Date().toISOString().split('T')[0];
  if (!statistiques.activitesCompletes[aujourdhui]) {
    statistiques.activitesCompletes[aujourdhui] = [];
  }
  if (!statistiques.activitesReportees[aujourdhui]) {
    statistiques.activitesReportees[aujourdhui] = [];
  }
  if (!statistiques.activitesAnnulees[aujourdhui]) {
    statistiques.activitesAnnulees[aujourdhui] = [];
  }
}

// ========================================
// 🕒 FONCTIONS UTILITAIRES
// ========================================
function heureEnMinutes(heure) {
  const [h, m] = heure.split(':').map(Number);
  return h * 60 + m;
}

function maintenant() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function activiteEnCours() {
  const now = maintenant();
  return EDT.find(a => {
    const debut = heureEnMinutes(a.heureDebut);
    const fin = heureEnMinutes(a.heureFin);
    return now >= debut && now < fin;
  });
}

function prochaineActivite() {
  const now = maintenant();
  return EDT.find(a => heureEnMinutes(a.heureDebut) > now);
}

function formaterEDT() {
  let message = "📅 *TON EMPLOI DU TEMPS* 📅\n\n";
  EDT.forEach((a) => {
    message += `${a.emoji} *${a.nom}*\n`;
    message += `   ⏰ ${a.heureDebut} - ${a.heureFin}\n`;
    message += `   📝 ${a.description}\n\n`;
  });
  return message;
}

// ========================================
// 📊 FONCTIONS DE STATISTIQUES
// ========================================
function calculerStatsJour(jour) {
  const completes = statistiques.activitesCompletes[jour] || [];
  const reportees = statistiques.activitesReportees[jour] || [];
  const annulees = statistiques.activitesAnnulees[jour] || [];
  
  const total = EDT.length;
  const faites = completes.length;
  const pourcentage = total > 0 ? Math.round((faites / total) * 100) : 0;
  
  return { completes, reportees, annulees, total, faites, pourcentage };
}

function calculerStatsSemaine() {
  const aujourdhui = new Date();
  let totalCompletes = 0;
  let totalActivites = 0;
  const joursStats = [];
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(aujourdhui);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const stats = calculerStatsJour(dateStr);
    totalCompletes += stats.faites;
    totalActivites += stats.total;
    
    joursStats.push({
      date: dateStr,
      jour: date.toLocaleDateString('fr-FR', { weekday: 'short' }),
      ...stats
    });
  }
  
  const pourcentageSemaine = totalActivites > 0 
    ? Math.round((totalCompletes / totalActivites) * 100) 
    : 0;
  
  return { joursStats, totalCompletes, totalActivites, pourcentageSemaine };
}

function genererMessageStats() {
  const aujourdhui = new Date().toISOString().split('T')[0];
  const statsJour = calculerStatsJour(aujourdhui);
  const statsSemaine = calculerStatsSemaine();
  
  let message = "📊 *TES STATISTIQUES* 📊\n\n";
  
  // Stats du jour
  message += "📅 *Aujourd'hui :*\n";
  message += `✅ ${statsJour.faites}/${statsJour.total} activités complétées (${statsJour.pourcentage}%)\n`;
  if (statsJour.reportees.length > 0) {
    message += `⏭️ ${statsJour.reportees.length} reportée(s)\n`;
  }
  if (statsJour.annulees.length > 0) {
    message += `❌ ${statsJour.annulees.length} annulée(s)\n`;
  }
  
  // Barre de progression
  const barreComplete = Math.floor(statsJour.pourcentage / 10);
  const barreVide = 10 - barreComplete;
  message += `${"🟩".repeat(barreComplete)}${"⬜".repeat(barreVide)} ${statsJour.pourcentage}%\n\n`;
  
  // Stats de la semaine
  message += "📈 *Cette semaine (7 derniers jours) :*\n";
  message += `✅ ${statsSemaine.totalCompletes}/${statsSemaine.totalActivites} activités (${statsSemaine.pourcentageSemaine}%)\n\n`;
  
  // Détail par jour
  message += "*Détail :*\n";
  statsSemaine.joursStats.forEach(j => {
    const emoji = j.pourcentage >= 80 ? "🔥" : j.pourcentage >= 50 ? "✅" : "📊";
    message += `${emoji} ${j.jour} : ${j.faites}/${j.total} (${j.pourcentage}%)\n`;
  });
  
  // Motivation
  if (statsJour.pourcentage >= 80) {
    message += "\n🔥 *Excellent travail !* Continue comme ça !";
  } else if (statsJour.pourcentage >= 50) {
    message += "\n💪 *Bien joué !* Tu peux encore améliorer !";
  } else {
    message += "\n🌱 *Chaque effort compte !* Bismillah pour la suite !";
  }
  
  return message;
}

// ========================================
// 🔘 BOUTONS INTERACTIFS
// ========================================
function creerBoutonsActivite(activiteId) {
  return {
    inline_keyboard: [
      [
        { text: '✅ Fait', callback_data: `fait_${activiteId}` },
        { text: '⏭️ Reporter', callback_data: `reporter_${activiteId}` }
      ],
      [
        { text: '❌ Annuler', callback_data: `annuler_${activiteId}` }
      ]
    ]
  };
}

function creerBoutonsCommandes() {
  return {
    inline_keyboard: [
      [
        { text: '📅 Programme', callback_data: 'cmd_programme' },
        { text: '⏰ Maintenant', callback_data: 'cmd_maintenant' }
      ],
      [
        { text: '➡️ Prochain', callback_data: 'cmd_prochain' },
        { text: '📊 Stats', callback_data: 'cmd_stats' }
      ]
    ]
  };
}

// ========================================
// 📨 GESTION DES CALLBACKS (BOUTONS)
// ========================================
bot.on('callback_query', (query) => {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const data = query.data;
  
  initialiserJour();
  const aujourdhui = new Date().toISOString().split('T')[0];
  
  // Actions sur les activités
  if (data.startsWith('fait_')) {
    const activiteId = parseInt(data.split('_')[1]);
    const activite = EDT.find(a => a.id === activiteId);
    
    if (!statistiques.activitesCompletes[aujourdhui].includes(activiteId)) {
      statistiques.activitesCompletes[aujourdhui].push(activiteId);
    }
    
    const statsJour = calculerStatsJour(aujourdhui);
    bot.editMessageText(
      `✅ *Activité validée !*\n\n${activite.emoji} ${activite.nom}\n\n📊 Progression du jour : ${statsJour.faites}/${statsJour.total} (${statsJour.pourcentage}%)\n\n💪 MashAllah, continue comme ça !`,
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown'
      }
    );
    
    bot.answerCallbackQuery(query.id, { text: '✅ Activité complétée !' });
  }
  
  else if (data.startsWith('reporter_')) {
    const activiteId = parseInt(data.split('_')[1]);
    const activite = EDT.find(a => a.id === activiteId);
    
    if (!statistiques.activitesReportees[aujourdhui].includes(activiteId)) {
      statistiques.activitesReportees[aujourdhui].push(activiteId);
    }
    
    bot.editMessageText(
      `⏭️ *Activité reportée*\n\n${activite.emoji} ${activite.nom}\n\nPas de problème ! Tu pourras la faire plus tard insha'Allah.`,
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown'
      }
    );
    
    bot.answerCallbackQuery(query.id, { text: '⏭️ Activité reportée' });
  }
  
  else if (data.startsWith('annuler_')) {
    const activiteId = parseInt(data.split('_')[1]);
    const activite = EDT.find(a => a.id === activiteId);
    
    if (!statistiques.activitesAnnulees[aujourdhui].includes(activiteId)) {
      statistiques.activitesAnnulees[aujourdhui].push(activiteId);
    }
    
    bot.editMessageText(
      `❌ *Activité annulée*\n\n${activite.emoji} ${activite.nom}\n\nC'est noté. On reprend demain insha'Allah !`,
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown'
      }
    );
    
    bot.answerCallbackQuery(query.id, { text: '❌ Activité annulée' });
  }
  
  // Commandes rapides
  else if (data === 'cmd_programme') {
    bot.sendMessage(chatId, formaterEDT(), { parse_mode: 'Markdown' });
    bot.answerCallbackQuery(query.id);
  }
  
  else if (data === 'cmd_maintenant') {
    const activite = activiteEnCours();
    if (activite) {
      bot.sendMessage(
        chatId,
        `⏳ *EN CE MOMENT :*\n\n${activite.emoji} ${activite.nom}\n⏰ ${activite.heureDebut} - ${activite.heureFin}\n📝 ${activite.description}`,
        { parse_mode: 'Markdown' }
      );
    } else {
      bot.sendMessage(chatId, "🌙 Aucune activité prévue maintenant.");
    }
    bot.answerCallbackQuery(query.id);
  }
  
  else if (data === 'cmd_prochain') {
    const prochaine = prochaineActivite();
    if (prochaine) {
      bot.sendMessage(
        chatId,
        `➡️ *PROCHAINE ACTIVITÉ :*\n\n${prochaine.emoji} ${prochaine.nom}\n⏰ ${prochaine.heureDebut}\n📝 ${prochaine.description}`,
        { parse_mode: 'Markdown' }
      );
    } else {
      bot.sendMessage(chatId, "🌙 Plus d'activités prévues aujourd'hui.");
    }
    bot.answerCallbackQuery(query.id);
  }
  
  else if (data === 'cmd_stats') {
    bot.sendMessage(chatId, genererMessageStats(), { parse_mode: 'Markdown' });
    bot.answerCallbackQuery(query.id);
  }
});

// ========================================
// 🎨 NOTIFICATIONS PERSONNALISÉES
// ========================================

// URLs d'images/GIFs pour chaque activité (exemples)
const MEDIA = {
  sport: 'https://media.giphy.com/media/3o7TKF1fSIs1R19B8k/giphy.gif',
  quran: 'https://example.com/quran-beautiful.jpg',
  khassida: 'https://example.com/islamic-calligraphy.jpg',
  motivation: 'https://media.giphy.com/media/26FPy3QZQqGtDcrja/giphy.gif'
};

// Messages motivants variés
const MESSAGES_MOTIVATION = [
  "💪 Qu'Allah facilite !",
  "🔥 Tu es sur la bonne voie !",
  "✨ Chaque effort compte !",
  "🌟 Bismillah, courage !",
  "💎 La constance mène au succès !"
];

function getMessageMotivation() {
  return MESSAGES_MOTIVATION[Math.floor(Math.random() * MESSAGES_MOTIVATION.length)];
}

// Fonction d'émoji selon l'heure
function getEmojiHeure() {
  const heure = new Date().getHours();
  if (heure < 6) return '🌙';
  if (heure < 12) return '☀️';
  if (heure < 18) return '🌤️';
  return '🌆';
}

// ========================================
// NOTIFICATION 10 MINUTES AVANT (Améliorée)
// ========================================
EDT.forEach(activite => {
  const [h, m] = activite.heureDebut.split(':').map(Number);
  const minutesAvant = m - 10;
  const heureAvant = minutesAvant < 0 ? h - 1 : h;
  const minAvant = minutesAvant < 0 ? 60 + minutesAvant : minutesAvant;
  
  cron.schedule(`${minAvant} ${heureAvant} * * *`, () => {
    initialiserJour();
    const aujourdhui = new Date().toISOString().split('T')[0];
    const stats = calculerStatsJour(aujourdhui);
    
    const message = `
${getEmojiHeure()} *PRÉPARATION - DANS 10 MINUTES*

${activite.emoji} *${activite.nom}*
📝 ${activite.description}

📊 Progression du jour : ${stats.faites}/${stats.total}
${"🟩".repeat(stats.faites)}${"⬜".repeat(stats.total - stats.faites)}

🔔 Prépare-toi ! ${getMessageMotivation()}
    `.trim();
    
    bot.sendMessage(CHAT_ID, message, { parse_mode: 'Markdown' });
  });
  
  // ========================================
  // NOTIFICATION AU DÉBUT (Avec image/GIF selon l'activité)
  // ========================================
  cron.schedule(`${m} ${h} * * *`, () => {
    initialiserJour();
    const aujourdhui = new Date().toISOString().split('T')[0];
    const stats = calculerStatsJour(aujourdhui);
    
    const caption = `
⚡⚡⚡ *C'EST L'HEURE !* ⚡⚡⚡

${activite.emoji} *${activite.nom}*
⏰ ${activite.heureDebut} - ${activite.heureFin}

📊 ${stats.faites}/${stats.total} aujourd'hui
${stats.pourcentage >= 70 ? '🔥' : stats.pourcentage >= 50 ? '💪' : '🌱'} ${stats.pourcentage}% complétées

✨ Bismillah, c'est parti !
    `.trim();
    
    // Envoyer avec GIF pour le sport
    if (activite.id === 2) { // Sport
      bot.sendAnimation(CHAT_ID, MEDIA.sport, {
        caption: caption,
        parse_mode: 'Markdown',
        reply_markup: creerBoutonsActivite(activite.id)
      });
    }
    // Envoyer avec image pour les activités spirituelles
    else if ([3, 4, 5].includes(activite.id)) { // Diang, Sarr, Khassida
      // Si tu veux une image, décommente la ligne suivante
      // bot.sendPhoto(CHAT_ID, MEDIA.quran, { ... });
      
      // Sinon, message simple avec beaucoup d'émojis
      bot.sendMessage(CHAT_ID, caption, {
        parse_mode: 'Markdown',
        reply_markup: creerBoutonsActivite(activite.id)
      });
    }
    // Message simple pour les autres
    else {
      bot.sendMessage(CHAT_ID, caption, {
        parse_mode: 'Markdown',
        reply_markup: creerBoutonsActivite(activite.id)
      });
    }
  });
  
  // ========================================
  // NOTIFICATION À LA FIN (Avec encouragement)
  // ========================================
  const [hFin, mFin] = activite.heureFin.split(':').map(Number);
  cron.schedule(`${mFin} ${hFin} * * *`, () => {
    initialiserJour();
    const aujourdhui = new Date().toISOString().split('T')[0];
    const stats = calculerStatsJour(aujourdhui);
    const prochaine = prochaineActivite();
    
    // Message différent si l'activité a été validée ou non
    const estValidee = stats.completes.includes(activite.id);
    
    let message = estValidee 
      ? `✅ *BRAVO !*\n\n${activite.emoji} ${activite.nom} terminé !\n\n`
      : `⏱️ *TEMPS ÉCOULÉ*\n\n${activite.emoji} ${activite.nom}\n\n`;
    
    if (prochaine) {
      message += `➡️ *Prochaine activité :*\n${prochaine.emoji} ${prochaine.nom}\n⏰ Dans ${calculerTempsAvant(prochaine)} min`;
    } else {
      message += `🌙 C'était la dernière activité.\n\n📊 Tape /stats pour ton bilan !`;
    }
    
    // Ajouter stats de la journée
    message += `\n\n📊 Bilan du jour : ${stats.faites}/${stats.total} (${stats.pourcentage}%)`;
    
    if (stats.pourcentage >= 80) {
      message += '\n\n🔥 *Excellent travail !* MashAllah !';
    } else if (stats.pourcentage >= 50) {
      message += '\n\n💪 *Bien joué !* Continue !';
    }
    
    bot.sendMessage(CHAT_ID, message, {
      parse_mode: 'Markdown',
      reply_markup: estValidee ? creerBoutonsCommandes() : creerBoutonsActivite(activite.id)
    });
  });
});

// Fonction helper pour calculer le temps avant une activité
function calculerTempsAvant(activite) {
  const now = maintenant();
  const debut = heureEnMinutes(activite.heureDebut);
  return debut - now;
}

// ========================================
// NOTIFICATION SPÉCIALE : Milieu de journée
// ========================================
cron.schedule('0 13 * * *', () => {
  initialiserJour();
  const aujourdhui = new Date().toISOString().split('T')[0];
  const stats = calculerStatsJour(aujourdhui);
  
  if (stats.faites === 0) {
    bot.sendMessage(CHAT_ID, 
      `🌤️ *Petit rappel de midi*\n\nTu n'as pas encore validé d'activités aujourd'hui.\n\n💪 Ce n'est pas grave ! La journée n'est pas finie.\n\n✨ ${getMessageMotivation()}`,
      { parse_mode: 'Markdown', reply_markup: creerBoutonsCommandes() }
    );
  } else if (stats.pourcentage >= 80) {
    bot.sendMessage(CHAT_ID, 
      `🔥 *Tu cartonne aujourd'hui !*\n\n${stats.faites}/${stats.total} activités validées (${stats.pourcentage}%)\n\n🌟 Continue comme ça !`,
      { parse_mode: 'Markdown' }
    );
  }
});

// ========================================
// NOTIFICATION : Encouragement du soir (22h)
// ========================================
cron.schedule('0 22 * * *', () => {
  initialiserJour();
  const aujourdhui = new Date().toISOString().split('T')[0];
  const stats = calculerStatsJour(aujourdhui);
  
  let message = '🌙 *Bonsoir Saliou*\n\n';
  
  if (stats.pourcentage >= 80) {
    message += `🔥 *Journée exceptionnelle !*\n\n${stats.faites}/${stats.total} activités complétées\n\n🏆 Tu es un champion ! Qu'Allah te récompense !`;
  } else if (stats.pourcentage >= 50) {
    message += `💪 *Belle journée !*\n\n${stats.faites}/${stats.total} activités complétées\n\n✨ Continue comme ça demain insha'Allah !`;
  } else {
    message += `🌱 *Chaque effort compte*\n\n${stats.faites}/${stats.total} activités aujourd'hui\n\n💎 Demain sera meilleur insha'Allah !\n\nLa constance est la clé.`;
  }
  
  message += '\n\n📊 Tape /stats pour voir le détail complet';
  
  bot.sendMessage(CHAT_ID, message, { 
    parse_mode: 'Markdown',
    reply_markup: creerBoutonsCommandes()
  });
});
// ========================================
// ⏰ NOTIFICATIONS PROGRAMMÉES
// ========================================

// Résumé du matin à 5h00
cron.schedule('0 5 * * *', () => {
  initialiserJour();
  const message = `☀️ *BONJOUR SALIOU !* ☀️\n\n${formaterEDT()}\n💪 Bonne journée remplie de baraka !`;
  bot.sendMessage(CHAT_ID, message, { 
    parse_mode: 'Markdown',
    reply_markup: creerBoutonsCommandes()
  });
});

// Bilan du soir à 23h
cron.schedule('0 23 * * *', () => {
  bot.sendMessage(CHAT_ID, genererMessageStats(), { 
    parse_mode: 'Markdown'
  });
});

// Pour chaque activité
EDT.forEach(activite => {
  const [h, m] = activite.heureDebut.split(':').map(Number);
  
  // 10 minutes avant
  const minutesAvant = m - 10;
  const heureAvant = minutesAvant < 0 ? h - 1 : h;
  const minAvant = minutesAvant < 0 ? 60 + minutesAvant : minutesAvant;
  
  cron.schedule(`${minAvant} ${heureAvant} * * *`, () => {
    bot.sendMessage(
      CHAT_ID,
      `⏰ *DANS 10 MINUTES*\n\n${activite.emoji} ${activite.nom}\n📝 ${activite.description}\n\n🔔 Prépare-toi !`,
      { parse_mode: 'Markdown' }
    );
  });
  
  // Au début
  cron.schedule(`${m} ${h} * * *`, () => {
    bot.sendMessage(
      CHAT_ID,
      `▶️ *C'EST L'HEURE !*\n\n${activite.emoji} ${activite.nom}\n📝 ${activite.description}\n\n✨ Bismillah, c'est parti !`,
      { 
        parse_mode: 'Markdown',
        reply_markup: creerBoutonsActivite(activite.id)
      }
    );
  });
  
  // À la fin
  const [hFin, mFin] = activite.heureFin.split(':').map(Number);
  cron.schedule(`${mFin} ${hFin} * * *`, () => {
    const prochaine = prochaineActivite();
    let message = `⏱️ *TEMPS ÉCOULÉ*\n\n${activite.emoji} ${activite.nom}\n\n`;
    
    if (prochaine) {
      message += `➡️ *Prochaine :* ${prochaine.emoji} ${prochaine.nom}\n⏰ À ${prochaine.heureDebut}`;
    } else {
      message += `🌙 C'était la dernière activité.\n\nTape /stats pour voir ton bilan !`;
    }
    
    bot.sendMessage(CHAT_ID, message, {
      parse_mode: 'Markdown',
      reply_markup: creerBoutonsActivite(activite.id)
    });
  });
});

// ========================================
// 🤖 COMMANDES DU BOT
// ========================================

bot.onText(/\/start/, (msg) => {
  const message = `السلام عليكم *Saliou* ! 👋

Je suis ton assistant personnel avec suivi et statistiques !

🔔 *Notifications automatiques :*
• 5h00 : Résumé du jour
• 10 min avant : Préparation
• Au début : "C'est l'heure !" + boutons
• À la fin : Temps écoulé + boutons
• 23h00 : Bilan statistique

📊 *Suivi d'activités :*
Clique sur les boutons pour valider, reporter ou annuler !

💪 Qu'Allah facilite ton chemin !`;
  
  bot.sendMessage(msg.chat.id, message, { 
    parse_mode: 'Markdown',
    reply_markup: creerBoutonsCommandes()
  });
});

bot.onText(/\/programme/, (msg) => {
  bot.sendMessage(msg.chat.id, formaterEDT(), { parse_mode: 'Markdown' });
});

bot.onText(/\/maintenant/, (msg) => {
  const activite = activiteEnCours();
  if (activite) {
    bot.sendMessage(
      msg.chat.id,
      `⏳ *EN CE MOMENT :*\n\n${activite.emoji} ${activite.nom}\n⏰ ${activite.heureDebut} - ${activite.heureFin}\n📝 ${activite.description}`,
      { parse_mode: 'Markdown' }
    );
  } else {
    bot.sendMessage(msg.chat.id, "🌙 Aucune activité prévue maintenant.");
  }
});

bot.onText(/\/prochain/, (msg) => {
  const prochaine = prochaineActivite();
  if (prochaine) {
    bot.sendMessage(
      msg.chat.id,
      `➡️ *PROCHAINE ACTIVITÉ :*\n\n${prochaine.emoji} ${prochaine.nom}\n⏰ ${prochaine.heureDebut}\n📝 ${prochaine.description}`,
      { parse_mode: 'Markdown' }
    );
  } else {
    bot.sendMessage(msg.chat.id, "🌙 Plus d'activités prévues aujourd'hui.");
  }
});

bot.onText(/\/stats/, (msg) => {
  bot.sendMessage(msg.chat.id, genererMessageStats(), { parse_mode: 'Markdown' });
});

bot.onText(/\/menu/, (msg) => {
  bot.sendMessage(msg.chat.id, "🎯 *MENU RAPIDE*", {
    parse_mode: 'Markdown',
    reply_markup: creerBoutonsCommandes()
  });
});

// ========================================
// 🚀 DÉMARRAGE
// ========================================
console.log('🤖 Bot démarré avec succès !');
console.log(`📱 Chat ID : ${CHAT_ID}`);
console.log('⏰ Notifications actives');
console.log('📊 Système de suivi actif');
console.log('✅ En attente...');

bot.sendMessage(CHAT_ID, '✅ *Bot redémarré !*\n\n📊 Système de suivi activé\n🔘 Boutons interactifs prêts\n\n🚀 Je suis prêt !', { 
  parse_mode: 'Markdown',
  reply_markup: creerBoutonsCommandes()

});
