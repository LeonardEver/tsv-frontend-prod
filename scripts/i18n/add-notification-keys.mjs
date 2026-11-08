import { readFile, writeFile } from "node:fs/promises";
const entries = {
  notificationLesson: ["Lesson completed", "Aula concluída", "Lección completada", "Leçon terminée", "Lektion abgeschlossen", "Lezione completata"],
  notificationQuiz: ["Field test completed", "Teste de campo concluído", "Prueba de campo completada", "Test de terrain terminé", "Praxistest abgeschlossen", "Test sul campo completato"],
  notificationAchievement: ["New achievement unlocked", "Nova conquista desbloqueada", "Nuevo logro desbloqueado", "Nouveau succès débloqué", "Neuer Erfolg freigeschaltet", "Nuovo traguardo sbloccato"],
  notificationReply: ["New reply to your post", "Nova resposta à sua publicação", "Nueva respuesta a tu publicación", "Nouvelle réponse à votre publication", "Neue Antwort auf deinen Beitrag", "Nuova risposta al tuo post"],
  notificationUnread_one: ["{{count}} unread notification", "{{count}} notificação não lida", "{{count}} notificación sin leer", "{{count}} notification non lue", "{{count}} ungelesene Benachrichtigung", "{{count}} notifica non letta"],
  notificationUnread_other: ["{{count}} unread notifications", "{{count}} notificações não lidas", "{{count}} notificaciones sin leer", "{{count}} notifications non lues", "{{count}} ungelesene Benachrichtigungen", "{{count}} notifiche non lette"],
  notificationMarkAll: ["Mark all as read", "Marcar todas como lidas", "Marcar todas como leídas", "Tout marquer comme lu", "Alle als gelesen markieren", "Segna tutte come lette"],
  notificationSaving: ["Saving…", "Salvando…", "Guardando…", "Enregistrement…", "Wird gespeichert…", "Salvataggio…"],
  notificationLoading: ["Loading notifications…", "Carregando notificações…", "Cargando notificaciones…", "Chargement des notifications…", "Benachrichtigungen werden geladen…", "Caricamento delle notifiche…"],
  notificationLoadError: ["Couldn't load your notifications.", "Não foi possível carregar suas notificações.", "No se pudieron cargar tus notificaciones.", "Impossible de charger vos notifications.", "Deine Benachrichtigungen konnten nicht geladen werden.", "Impossibile caricare le tue notifiche."],
  notificationSaveError: ["Couldn't mark notifications as read. Please try again.", "Não foi possível marcar as notificações como lidas. Tente novamente.", "No se pudieron marcar las notificaciones como leídas. Inténtalo de nuevo.", "Impossible de marquer les notifications comme lues. Réessayez.", "Benachrichtigungen konnten nicht als gelesen markiert werden. Bitte erneut versuchen.", "Impossibile segnare le notifiche come lette. Riprova."],
  notificationRetry: ["Try again", "Tentar novamente", "Intentar de nuevo", "Réessayer", "Erneut versuchen", "Riprova"],
  notificationEmpty: ["You're all caught up", "Tudo em dia por aqui", "Estás al día", "Vous êtes à jour", "Du bist auf dem neuesten Stand", "Sei al passo"],
  notificationEmptyDetail: ["Completed lessons, earned achievements and replies to your posts appear here.", "Aulas concluídas, conquistas recebidas e respostas às suas publicações aparecem aqui.", "Aquí aparecen las lecciones completadas, los logros obtenidos y las respuestas a tus publicaciones.", "Vos leçons terminées, succès obtenus et réponses à vos publications apparaissent ici.", "Hier erscheinen abgeschlossene Lektionen, erhaltene Erfolge und Antworten auf deine Beiträge.", "Qui trovi lezioni completate, traguardi ottenuti e risposte ai tuoi post."],
  notificationNew: ["Unread", "Não lida", "Sin leer", "Non lue", "Ungelesen", "Non letta"],
  notificationRecent: ["Your 30 most recent account updates", "As 30 atualizações mais recentes da sua conta", "Las 30 actualizaciones más recientes de tu cuenta", "Les 30 dernières actualités de votre compte", "Die 30 neuesten Aktualisierungen deines Kontos", "I 30 aggiornamenti più recenti del tuo account"],
};
const file="src/i18n/locales/en/navigation.json";
const english=JSON.parse(await readFile(file,"utf8"));
const authored={};
for(const [key,[source,...translations]] of Object.entries(entries)) { english[key]=source; authored["navigation:"+key]=translations; }
await writeFile(file,JSON.stringify(english,null,2)+"\n");
await writeFile("scripts/i18n/copy/notifications.json",JSON.stringify(authored,null,2)+"\n");
