/**
 * Colombet Plomberie – envoi des demandes du site par Gmail
 * 1) Envoie la demande du client à Théo (colombetplomberie@gmail.com)
 * 2) Envoie au client un accusé de réception avec le logo et les coordonnées
 *
 * À coller dans script.google.com (connecté avec colombetplomberie@gmail.com),
 * puis Déployer > Nouveau déploiement > Application Web
 * (Exécuter en tant que : Moi · Qui a accès : Tout le monde).
 */

var DEST = 'colombetplomberie@gmail.com';
var TEL = '07 78 46 82 65';
var TEL_LINK = 'tel:+33778468265';
var SITE = 'https://colombet-plomberie.fr';
var LOGO = SITE + '/img/logo-mail.png';
var LOGO_BLANC = SITE + '/img/logo-mail-blanc.png';

function doPost(e) {
  try {
    var d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (d._honey) return out({ ok: true });                       // robot anti-spam
    if (!clean(d.nom) || !clean(d.tel)) return out({ ok: false, error: 'Nom et téléphone obligatoires' });

    var nomComplet = (clean(d.prenom) ? clean(d.prenom) + ' ' : '') + clean(d.nom);
    var urgent = d.urgent === true || d.urgent === 'true';
    var email = clean(d.email);
    var emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);

    // 1) Mail pour Théo
    var notif = {
      to: DEST,
      subject: (urgent ? 'URGENT - ' : '') + 'Nouvelle demande : ' + clean(d.besoin) + ' – ' + nomComplet,
      htmlBody: notifHtml(d, nomComplet, urgent, emailOk ? email : ''),
      body: texte(d, nomComplet),
      name: 'Site Colombet Plomberie'
    };
    if (emailOk) notif.replyTo = email;
    MailApp.sendEmail(notif);

    // 2) Accusé de réception pour le client
    if (emailOk) {
      MailApp.sendEmail({
        to: email,
        subject: 'Votre demande a bien été reçue - Colombet Plomberie',
        htmlBody: accuseHtml(d),
        body: 'Bonjour ' + (clean(d.prenom) || clean(d.nom)) + ',\n\nMerci pour votre demande, elle est bien arrivée. Théo l\'étudie et vous rappelle très rapidement.\n\n' + texte(d, (clean(d.prenom) ? clean(d.prenom) + ' ' : '') + clean(d.nom)) + '\n\nUne fuite en cours ? Appelez directement le ' + TEL + ', 24h/24 et 7j/7.\n\nThéo Colombet - Colombet Plomberie\n9 bis chemin de Carimaï, 06110 Le Cannet\ncolombet-plomberie.fr',
        name: 'Colombet Plomberie',
        replyTo: DEST
      });
    }
    return out({ ok: true, accuse: emailOk });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  }
}

function texte(d, nomComplet) {
  return 'Besoin : ' + clean(d.besoin) + '\nNom : ' + nomComplet + '\nTéléphone : ' + clean(d.tel) + '\nVille : ' + clean(d.ville) + '\nMessage : ' + (clean(d.message) || '-');
}

function doGet() { return out({ ok: true, service: 'Colombet Plomberie' }); }

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function clean(s) { return String(s == null ? '' : s).trim().slice(0, 2000); }
function esc(s) {
  return clean(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\n/g, '<br>');
}

function ligne(label, valeur, gras) {
  return '<tr><td style="padding:10px 12px;color:#5A6A86;width:38%;border-bottom:1px solid #E3EAF2;font-size:14px">' + label +
    '</td><td style="padding:10px 12px;border-bottom:1px solid #E3EAF2;font-size:14px;color:#20305B;' + (gras ? 'font-weight:bold' : '') + '">' +
    (valeur || '—') + '</td></tr>';
}

/* ---------- Mail reçu par Théo ---------- */
function notifHtml(d, nomComplet, urgent, email) {
  return '<div style="font-family:Arial,Helvetica,sans-serif;color:#20305B;max-width:600px">' +
    (urgent ? '<p style="background:#FDECEC;color:#B42318;padding:12px 14px;border-radius:8px;font-weight:bold;margin:0 0 14px">⚡ Demande URGENTE</p>' : '') +
    '<h2 style="margin:0 0 12px;font-size:20px">Nouvelle demande depuis le site</h2>' +
    '<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse">' +
    ligne('Besoin', esc(d.besoin), true) +
    ligne('Nom', esc(nomComplet), true) +
    ligne('Téléphone', '<a href="tel:' + esc(d.tel).replace(/\s/g, '') + '" style="color:#2E9BDA;font-weight:bold">' + esc(d.tel) + '</a>', false) +
    ligne('Email', email ? '<a href="mailto:' + esc(email) + '" style="color:#2E9BDA">' + esc(email) + '</a>' : '', false) +
    ligne('Ville', esc(d.ville), false) +
    ligne('Message', esc(d.message), false) +
    '</table>' +
    '<p style="color:#5A6A86;font-size:13px;margin-top:14px">' + (email ? 'Le client a reçu un accusé de réception. Vous pouvez répondre directement à ce mail pour lui écrire.' : 'Le client n\'a pas laissé d\'email : rappelez-le au téléphone.') + '</p></div>';
}

/* ---------- Accusé de réception reçu par le client (modèle B « Demande bien reçue ») ---------- */
function accuseHtml(d) {
  var prenom = clean(d.prenom) || clean(d.nom);
  return '' +
  '<div style="background:#E9EEF4;padding:20px 10px;font-family:Arial,Helvetica,sans-serif">' +
  '<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="width:100%;max-width:600px;background:#ffffff;border-radius:14px;border-collapse:separate;overflow:hidden;color:#20305B">' +

  // Bandeau marine avec logo
  '<tr><td style="background:#20305B;padding:30px;text-align:center">' +
    '<img src="' + LOGO_BLANC + '" width="190" alt="Colombet Plomberie" style="display:block;margin:0 auto;border:0;width:190px;height:auto">' +
    '<div style="color:#9DB0CF;font-size:12px;letter-spacing:2px;margin-top:10px">RÉACTIF · SOIGNÉ · HONNÊTE</div>' +
  '</td></tr>' +

  // Coche + titre
  '<tr><td style="text-align:center;padding:26px 30px 0">' +
    '<div style="display:inline-block;width:54px;height:54px;border-radius:50%;background:#E6F4FC;color:#2E9BDA;font-size:28px;line-height:54px;font-weight:bold">✓</div>' +
    '<h2 style="margin:12px 0 0;font-size:22px;color:#20305B">Demande bien reçue !</h2>' +
  '</td></tr>' +

  // Message + récapitulatif
  '<tr><td style="padding:18px 30px 10px">' +
    '<p style="margin:0 0 12px;font-size:16px">Bonjour ' + esc(prenom) + ',</p>' +
    '<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#33415C">Merci pour votre demande, elle est bien arrivée. Théo l\'étudie et <b>vous rappelle très rapidement</b>. Voici le récapitulatif :</p>' +
    '<div style="background:#F3F7FB;border-radius:12px;padding:6px 8px">' +
    '<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse">' +
      ligne('Besoin', esc(d.besoin), true) +
      ligne('Ville', esc(d.ville), true) +
      ligne('Téléphone', esc(d.tel), true) +
      '<tr><td style="padding:10px 12px;color:#5A6A86;font-size:14px;width:38%">Message</td><td style="padding:10px 12px;font-size:14px;color:#20305B">' + (esc(d.message) || '—') + '</td></tr>' +
    '</table></div>' +
    '<p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:#33415C">Une fuite en cours ? N\'attendez pas : appelez directement le <a href="' + TEL_LINK + '" style="color:#2E9BDA;font-weight:bold;text-decoration:none">' + TEL + '</a>, 24h/24 et 7j/7.</p>' +
  '</td></tr>' +

  // Bouton appeler
  '<tr><td style="text-align:center;padding:16px 30px 28px">' +
    '<a href="' + TEL_LINK + '" style="display:inline-block;background:#2E9BDA;color:#ffffff;font-weight:bold;font-size:16px;text-decoration:none;padding:14px 26px;border-radius:999px">📞 Appeler Théo · ' + TEL + '</a>' +
  '</td></tr>' +

  // Pied de page blanc avec logo couleur
  '<tr><td style="border-top:1px solid #E3EAF2;padding:24px 30px;text-align:center;font-size:12.5px;line-height:1.8;color:#5A6A86">' +
    '<img src="' + LOGO + '" width="120" alt="Colombet Plomberie" style="display:block;margin:0 auto 10px;border:0;width:120px;height:auto">' +
    '<b style="color:#20305B">Colombet Plomberie</b> · 9 bis chemin de Carimaï, 06110 Le Cannet<br>' +
    '<a href="' + SITE + '" style="color:#5A6A86;text-decoration:none">colombet-plomberie.fr</a> · ' +
    '<a href="mailto:' + DEST + '" style="color:#5A6A86;text-decoration:none">' + DEST + '</a> · ' +
    '<a href="' + TEL_LINK + '" style="color:#5A6A86;text-decoration:none">' + TEL + '</a><br>' +
    '⭐⭐⭐⭐⭐ 5,0/5 sur Google · Dépannage 24h/24, 7j/7 · Garantie décennale MAAF' +
  '</td></tr>' +
  '</table></div>';
}

/* Lancez cette fonction une fois pour autoriser l'envoi de mails (vous recevrez un mail de test). */
function testEnvoi() {
  var r = doPost({ postData: { contents: JSON.stringify({
    besoin: 'Dépannage', nom: 'Test', prenom: 'Théo', tel: TEL, ville: 'Le Cannet',
    message: 'Ceci est un test.', email: DEST, urgent: false
  }) } });
  Logger.log(r.getContent());
}
