/**
 * Strings for account recovery: "forgot password", the reset email and the
 * page that sets a new password. Kept apart from dentvideo-app.ts so new site
 * languages can be added without touching the rest; any language without its
 * own entry falls back to English.
 */

export type AuthCopy = {
  forgot: string;
  forgotTitle: string;
  forgotLead: string;
  sendLink: string;
  sent: string;
  backToSignIn: string;
  existsTryingSignIn: string;
  existsWrongPassword: string;
  signInFailedAfterSignup: string;
  resetTitle: string;
  resetLead: string;
  newPassword: string;
  savePassword: string;
  saved: string;
  linkInvalid: string;
  tooShort: string;
  email: { subject: string; hello: string; body: string; button: string; ignore: string; footer: string };
};

const COPY: Record<string, AuthCopy> = {
  en: {
    forgot: "Forgot your password?",
    forgotTitle: "Reset your password",
    forgotLead: "Enter the email you signed up with. We'll send you a link to choose a new password.",
    sendLink: "Send the link",
    sent: "If an account exists for this email, the link is on its way. It works for one hour — check your spam folder too.",
    backToSignIn: "Back to sign in",
    existsTryingSignIn: "You already have an account — signing you in…",
    existsWrongPassword: "An account with this email already exists, but the password doesn't match. Sign in, or reset your password.",
    signInFailedAfterSignup: "Your account is ready, but signing in didn't work just now. Please sign in below with the same email and password.",
    resetTitle: "Choose a new password",
    resetLead: "At least 8 characters. You'll be signed in right after.",
    newPassword: "New password",
    savePassword: "Save and continue",
    saved: "Password saved. Taking you to your clinic…",
    linkInvalid: "This link has expired or was already used. Ask for a new one.",
    tooShort: "Use at least 8 characters.",
    email: {
      subject: "Reset your DentVideo password",
      hello: "Hello,",
      body: "Someone asked to reset the password for this DentVideo account. Use the button below to choose a new one. The link works for one hour.",
      button: "Choose a new password",
      ignore: "If this wasn't you, ignore this email — your password stays the same.",
      footer: "You get this email because a password reset was requested on dentvideo.com.",
    },
  },
  tr: {
    forgot: "Şifrenizi mi unuttunuz?",
    forgotTitle: "Şifrenizi sıfırlayın",
    forgotLead: "Kayıt olduğunuz e-postayı yazın. Yeni şifre belirlemeniz için bir bağlantı gönderelim.",
    sendLink: "Bağlantıyı gönder",
    sent: "Bu e-postayla bir hesap varsa bağlantı yolda. Bir saat geçerli — spam klasörünüze de bakın.",
    backToSignIn: "Girişe dön",
    existsTryingSignIn: "Zaten bir hesabınız var — giriş yapılıyor…",
    existsWrongPassword: "Bu e-postayla bir hesap zaten var ama şifre eşleşmiyor. Giriş yapın ya da şifrenizi sıfırlayın.",
    signInFailedAfterSignup: "Hesabınız hazır ama giriş şu an tamamlanamadı. Lütfen aynı e-posta ve şifreyle aşağıdan giriş yapın.",
    resetTitle: "Yeni şifrenizi belirleyin",
    resetLead: "En az 8 karakter. Hemen ardından giriş yapmış olacaksınız.",
    newPassword: "Yeni şifre",
    savePassword: "Kaydet ve devam et",
    saved: "Şifre kaydedildi. Kliniğinize yönlendiriliyorsunuz…",
    linkInvalid: "Bu bağlantının süresi dolmuş ya da daha önce kullanılmış. Yeni bir bağlantı isteyin.",
    tooShort: "En az 8 karakter kullanın.",
    email: {
      subject: "DentVideo şifrenizi sıfırlayın",
      hello: "Merhaba,",
      body: "Bu DentVideo hesabı için şifre sıfırlama istendi. Yeni şifrenizi belirlemek için aşağıdaki düğmeyi kullanın. Bağlantı bir saat geçerlidir.",
      button: "Yeni şifre belirle",
      ignore: "Bu isteği siz yapmadıysanız bu e-postayı yok sayın — şifreniz değişmez.",
      footer: "Bu e-postayı dentvideo.com üzerinde şifre sıfırlama istendiği için alıyorsunuz.",
    },
  },
  de: {
    forgot: "Passwort vergessen?",
    forgotTitle: "Passwort zurücksetzen",
    forgotLead: "Geben Sie die E-Mail-Adresse Ihres Kontos ein. Wir senden Ihnen einen Link, um ein neues Passwort festzulegen.",
    sendLink: "Link senden",
    sent: "Falls ein Konto mit dieser Adresse existiert, ist der Link unterwegs. Er gilt eine Stunde — bitte prüfen Sie auch den Spam-Ordner.",
    backToSignIn: "Zurück zur Anmeldung",
    existsTryingSignIn: "Sie haben bereits ein Konto — Sie werden angemeldet …",
    existsWrongPassword: "Mit dieser E-Mail-Adresse besteht bereits ein Konto, aber das Passwort stimmt nicht. Melden Sie sich an oder setzen Sie Ihr Passwort zurück.",
    signInFailedAfterSignup: "Ihr Konto ist angelegt, die Anmeldung hat aber gerade nicht geklappt. Bitte melden Sie sich unten mit derselben E-Mail-Adresse und demselben Passwort an.",
    resetTitle: "Neues Passwort festlegen",
    resetLead: "Mindestens 8 Zeichen. Danach sind Sie direkt angemeldet.",
    newPassword: "Neues Passwort",
    savePassword: "Speichern und weiter",
    saved: "Passwort gespeichert. Sie werden zu Ihrer Praxis weitergeleitet …",
    linkInvalid: "Dieser Link ist abgelaufen oder wurde bereits verwendet. Fordern Sie einen neuen an.",
    tooShort: "Bitte mindestens 8 Zeichen verwenden.",
    email: {
      subject: "Ihr DentVideo-Passwort zurücksetzen",
      hello: "Guten Tag,",
      body: "für dieses DentVideo-Konto wurde das Zurücksetzen des Passworts angefordert. Über die Schaltfläche unten legen Sie ein neues fest. Der Link gilt eine Stunde.",
      button: "Neues Passwort festlegen",
      ignore: "Falls Sie das nicht waren, ignorieren Sie diese E-Mail — Ihr Passwort bleibt unverändert.",
      footer: "Sie erhalten diese E-Mail, weil auf dentvideo.com ein neues Passwort angefordert wurde.",
    },
  },
  es: {
    forgot: "¿Olvidaste tu contraseña?",
    forgotTitle: "Restablece tu contraseña",
    forgotLead: "Escribe el correo con el que te registraste. Te enviaremos un enlace para elegir una contraseña nueva.",
    sendLink: "Enviar el enlace",
    sent: "Si existe una cuenta con este correo, el enlace va en camino. Es válido durante una hora; revisa también la carpeta de spam.",
    backToSignIn: "Volver a iniciar sesión",
    existsTryingSignIn: "Ya tienes una cuenta: iniciando sesión…",
    existsWrongPassword: "Ya existe una cuenta con este correo, pero la contraseña no coincide. Inicia sesión o restablece tu contraseña.",
    signInFailedAfterSignup: "Tu cuenta está lista, pero no se pudo iniciar sesión ahora mismo. Inicia sesión abajo con el mismo correo y contraseña.",
    resetTitle: "Elige una contraseña nueva",
    resetLead: "Mínimo 8 caracteres. Iniciarás sesión justo después.",
    newPassword: "Contraseña nueva",
    savePassword: "Guardar y continuar",
    saved: "Contraseña guardada. Te llevamos a tu clínica…",
    linkInvalid: "Este enlace ha caducado o ya se usó. Pide uno nuevo.",
    tooShort: "Usa al menos 8 caracteres.",
    email: {
      subject: "Restablece tu contraseña de DentVideo",
      hello: "Hola:",
      body: "Se ha pedido restablecer la contraseña de esta cuenta de DentVideo. Usa el botón de abajo para elegir una nueva. El enlace es válido durante una hora.",
      button: "Elegir contraseña nueva",
      ignore: "Si no fuiste tú, ignora este correo: tu contraseña no cambia.",
      footer: "Recibes este correo porque se pidió restablecer una contraseña en dentvideo.com.",
    },
  },
  fr: {
    forgot: "Mot de passe oublié ?",
    forgotTitle: "Réinitialiser votre mot de passe",
    forgotLead: "Indiquez l'e-mail de votre compte. Nous vous enverrons un lien pour choisir un nouveau mot de passe.",
    sendLink: "Envoyer le lien",
    sent: "Si un compte existe pour cet e-mail, le lien est en route. Il est valable une heure — pensez à vérifier vos spams.",
    backToSignIn: "Retour à la connexion",
    existsTryingSignIn: "Vous avez déjà un compte — connexion en cours…",
    existsWrongPassword: "Un compte existe déjà avec cet e-mail, mais le mot de passe ne correspond pas. Connectez-vous ou réinitialisez votre mot de passe.",
    signInFailedAfterSignup: "Votre compte est prêt, mais la connexion n'a pas abouti à l'instant. Connectez-vous ci-dessous avec le même e-mail et le même mot de passe.",
    resetTitle: "Choisissez un nouveau mot de passe",
    resetLead: "Au moins 8 caractères. Vous serez connecté juste après.",
    newPassword: "Nouveau mot de passe",
    savePassword: "Enregistrer et continuer",
    saved: "Mot de passe enregistré. Redirection vers votre cabinet…",
    linkInvalid: "Ce lien a expiré ou a déjà été utilisé. Demandez-en un nouveau.",
    tooShort: "Utilisez au moins 8 caractères.",
    email: {
      subject: "Réinitialisez votre mot de passe DentVideo",
      hello: "Bonjour,",
      body: "Une réinitialisation du mot de passe a été demandée pour ce compte DentVideo. Utilisez le bouton ci-dessous pour en choisir un nouveau. Le lien est valable une heure.",
      button: "Choisir un nouveau mot de passe",
      ignore: "Si ce n'était pas vous, ignorez cet e-mail — votre mot de passe ne change pas.",
      footer: "Vous recevez cet e-mail car une réinitialisation a été demandée sur dentvideo.com.",
    },
  },
};

export const AUTH_LANGUAGES = Object.keys(COPY);

export function authText(locale: string | undefined | null): AuthCopy {
  return COPY[locale ?? "en"] ?? COPY.en;
}
