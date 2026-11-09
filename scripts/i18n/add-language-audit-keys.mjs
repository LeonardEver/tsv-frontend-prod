import { readFile, writeFile } from "node:fs/promises";
const additions = {
  common: {
    takeLesson: ["Take lesson", "Iniciar aula", "Iniciar lección", "Commencer la leçon", "Lektion starten", "Inizia la lezione"],
    takeQuiz: ["Take quiz", "Iniciar quiz", "Iniciar cuestionario", "Commencer le quiz", "Quiz starten", "Inizia il quiz"],
    retakeQuiz: ["Retake quiz", "Refazer quiz", "Repetir cuestionario", "Refaire le quiz", "Quiz wiederholen", "Ripeti il quiz"],
    enterMission: ["Enter mission", "Entrar na missão", "Entrar en la misión", "Ouvrir la mission", "Mission öffnen", "Apri la missione"],
    exploreSurvivor: ["Explore Survivor", "Conheça o Survivor", "Conoce Survivor", "Découvrir Survivor", "Survivor entdecken", "Scopri Survivor"],
    selectCountry: ["Select a country or region", "Selecione um país ou região", "Selecciona un país o región", "Choisir un pays ou une région", "Land oder Region auswählen", "Seleziona un paese o una regione"],
    modeSimplified: ["Simplified", "Simplificado", "Simplificado", "Simplifié", "Vereinfacht", "Semplificato"],
    textUnavailable: ["Text unavailable", "Texto indisponível", "Texto no disponible", "Texte indisponible", "Text nicht verfügbar", "Testo non disponibile"],
    actionQuizPassed: ["Quiz passed", "Quiz aprovado", "Cuestionario aprobado", "Quiz réussi", "Quiz bestanden", "Quiz superato"],
    actionAchievement: ["Achievement earned", "Conquista obtida", "Logro obtenido", "Succès obtenu", "Erfolg freigeschaltet", "Traguardo raggiunto"],
    actionStreakMilestone: ["Streak milestone", "Marco de sequência", "Hito de racha", "Étape de série", "Serienmeilenstein", "Traguardo della serie"],
    actionXp: ["Experience earned", "Experiência obtida", "Experiencia obtenida", "Expérience acquise", "Erfahrung erhalten", "Esperienza ottenuta"],
    calloutFieldNote: ["Field note", "Nota de campo", "Nota de campo", "Note de terrain", "Feldnotiz", "Nota sul campo"],
    calloutWarning: ["Warning", "Aviso", "Advertencia", "Avertissement", "Warnung", "Avvertenza"],
    calloutSafety: ["Safety", "Segurança", "Seguridad", "Sécurité", "Sicherheit", "Sicurezza"],
    calloutImportant: ["Important", "Importante", "Importante", "Important", "Wichtig", "Importante"],
    calloutRemember: ["Remember", "Lembre-se", "Recuerda", "À retenir", "Merke", "Ricorda"],
    calloutProcedure: ["Procedure", "Procedimento", "Procedimiento", "Procédure", "Vorgehensweise", "Procedura"],
    calloutExample: ["Example", "Exemplo", "Ejemplo", "Exemple", "Beispiel", "Esempio"],
    calloutKnowledgeCheck: ["Knowledge check", "Verificação de conhecimento", "Comprobación de conocimientos", "Vérification des connaissances", "Wissensüberprüfung", "Verifica delle conoscenze"],
  },
  errors: {
    contentTranslationUnavailable: ["This content is temporarily unavailable in your language. Please try again shortly.", "Este conteúdo está temporariamente indisponível no seu idioma. Tente novamente em instantes.", "Este contenido no está disponible temporalmente en tu idioma. Inténtalo de nuevo en unos instantes.", "Ce contenu est temporairement indisponible dans votre langue. Réessayez dans un instant.", "Dieser Inhalt ist in deiner Sprache vorübergehend nicht verfügbar. Versuche es gleich erneut.", "Questo contenuto è temporaneamente non disponibile nella tua lingua. Riprova tra poco."],
    retryAfterSeconds: ["Try again in about {{seconds}} seconds.", "Tente novamente em cerca de {{seconds}} segundos.", "Inténtalo de nuevo en unos {{seconds}} segundos.", "Réessayez dans environ {{seconds}} secondes.", "Versuche es in etwa {{seconds}} Sekunden erneut.", "Riprova tra circa {{seconds}} secondi."],
    waitBeforeRetry: ["Please wait a moment and try again.", "Aguarde um momento e tente novamente.", "Espera un momento e inténtalo de nuevo.", "Patientez un instant et réessayez.", "Warte einen Moment und versuche es erneut.", "Attendi un momento e riprova."],
  },
  subscriptions: {
    priceMonthly: ["{{price}} /month", "{{price}} /mês", "{{price}} /mes", "{{price}} /mois", "{{price}} /Monat", "{{price}} /mese"],
    freeTagline: ["Your daily training ration. One lesson and one field test a day.", "Sua dose diária de treinamento. Uma aula e um teste de campo por dia.", "Tu dosis diaria de entrenamiento. Una lección y una prueba de campo al día.", "Votre entraînement quotidien. Une leçon et un test de terrain par jour.", "Dein tägliches Training. Eine Lektion und ein Praxistest pro Tag.", "Il tuo allenamento quotidiano. Una lezione e una prova sul campo al giorno."],
    survivorTagline: ["10 lessons and 10 field tests a day, community access and downloadable field resources.", "10 aulas e 10 testes de campo por dia, acesso à comunidade e recursos de campo para baixar.", "10 lecciones y 10 pruebas de campo al día, acceso a la comunidad y recursos de campo descargables.", "10 leçons et 10 tests de terrain par jour, accès à la communauté et ressources de terrain à télécharger.", "10 Lektionen und 10 Praxistests pro Tag, Zugang zur Community und herunterladbare Feldmaterialien.", "10 lezioni e 10 prove sul campo al giorno, accesso alla community e risorse sul campo da scaricare."],
    operatorTagline: ["Unlimited training. Everything in Survivor, without daily limits.", "Treinamento ilimitado. Tudo do Survivor, sem limites diários.", "Entrenamiento ilimitado. Todo lo de Survivor, sin límites diarios.", "Entraînement illimité. Tout le contenu de Survivor, sans limites quotidiennes.", "Unbegrenztes Training. Alles aus Survivor, ohne Tageslimits.", "Allenamento illimitato. Tutto ciò che offre Survivor, senza limiti giornalieri."],
    unlimitedLessons: ["Unlimited lessons per day", "Aulas ilimitadas por dia", "Lecciones ilimitadas al día", "Leçons illimitées par jour", "Unbegrenzte Lektionen pro Tag", "Lezioni illimitate al giorno"],
    unlimitedTests: ["Unlimited field tests per day", "Testes de campo ilimitados por dia", "Pruebas de campo ilimitadas al día", "Tests de terrain illimités par jour", "Unbegrenzte Praxistests pro Tag", "Prove sul campo illimitate al giorno"],
    dailyLessons_one: ["{{count}} lesson per day", "{{count}} aula por dia", "{{count}} lección al día", "{{count}} leçon par jour", "{{count}} Lektion pro Tag", "{{count}} lezione al giorno"],
    dailyLessons_other: ["{{count}} lessons per day", "{{count}} aulas por dia", "{{count}} lecciones al día", "{{count}} leçons par jour", "{{count}} Lektionen pro Tag", "{{count}} lezioni al giorno"],
    dailyTests_one: ["{{count}} field test per day", "{{count}} teste de campo por dia", "{{count}} prueba de campo al día", "{{count}} test de terrain par jour", "{{count}} Praxistest pro Tag", "{{count}} prova sul campo al giorno"],
    dailyTests_other: ["{{count}} field tests per day", "{{count}} testes de campo por dia", "{{count}} pruebas de campo al día", "{{count}} tests de terrain par jour", "{{count}} Praxistests pro Tag", "{{count}} prove sul campo al giorno"],
  },
  progress: {
    currentLevel: ["Current level: {{level}}", "Nível atual: {{level}}", "Nivel actual: {{level}}", "Niveau actuel : {{level}}", "Aktuelle Stufe: {{level}}", "Livello attuale: {{level}}"],
    levelUnavailable: ["Level unavailable", "Nível indisponível", "Nivel no disponible", "Niveau indisponible", "Stufe nicht verfügbar", "Livello non disponibile"],
  },
};
const copy = {};
for (const [namespace, values] of Object.entries(additions)) {
  const file = `src/i18n/locales/en/${namespace}.json`;
  const english = JSON.parse(await readFile(file, "utf8"));
  for (const [key, [source, ...targets]] of Object.entries(values)) { english[key] = source; copy[`${namespace}:${key}`] = targets; }
  await writeFile(file, JSON.stringify(english, null, 2) + "\n");
}
await writeFile("scripts/i18n/copy/language-audit.json", JSON.stringify(copy, null, 2) + "\n");
