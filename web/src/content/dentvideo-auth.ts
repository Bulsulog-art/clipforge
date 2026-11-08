/**
 * Strings for account recovery: "forgot password", the reset email and the
 * page that sets a new password. Kept apart from dentvideo-app.ts so new site
 * languages can be added without touching the rest; any language without its
 * own entry falls back to English.
 */
import type { Locale } from "./dentvideo";

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

// ---------------------------------------------------------------------------
// Email ownership: the 6-digit code after sign-up (lib/dentvid/verify-email).
// Every site language has its own entry — the parity test checks the keys and
// placeholders match English. {email}, {n}, {s} and {code} are filled in by fmtAuth.

export type VerifyCopy = {
  title: string;
  /** {email} */
  lead: string;
  codeLabel: string;
  codeHint: string;
  submit: string;
  checking: string;
  resend: string;
  /** {s} seconds */
  resendIn: string;
  /** {email} */
  resent: string;
  changeEmail: string;
  newEmailLabel: string;
  saveEmail: string;
  cancel: string;
  done: string;
  /** {n} tries left */
  wrong: string;
  expired: string;
  locked: string;
  none: string;
  malformed: string;
  emailTaken: string;
  failed: string;
  checkoutBlocked: string;
  email: {
    /** {code} */
    subject: string;
    hello: string;
    body: string;
    expires: string;
    ignore: string;
    footer: string;
  };
};

const VERIFY: Record<Locale, VerifyCopy> = {
  en: {
    title: "Confirm your email",
    lead: "We sent a 6-digit code to {email}. Enter it to choose your plan.",
    codeLabel: "6-digit code",
    codeHint: "Can't find it? Check your spam folder. The code works for 15 minutes.",
    submit: "Confirm",
    checking: "Checking…",
    resend: "Send a new code",
    resendIn: "New code in {s} s",
    resent: "A new code is on its way to {email}.",
    changeEmail: "Change email",
    newEmailLabel: "Your email address",
    saveEmail: "Send the code here",
    cancel: "Cancel",
    done: "Email confirmed. Choose your plan below.",
    wrong: "That code doesn't match. {n} tries left.",
    expired: "This code has expired. Send a new one.",
    locked: "Too many wrong tries. Send a new code.",
    none: "No code is waiting for this address. Send a new one.",
    malformed: "Enter the 6 digits from the email.",
    emailTaken: "Another account already uses this email.",
    failed: "That didn't work. Please try again in a moment.",
    checkoutBlocked: "Please confirm your email first: enter the 6-digit code we sent you.",
    email: {
      subject: "{code} is your DentVideo code",
      hello: "Hello,",
      body: "Enter this code on dentvideo.com to confirm your email address:",
      expires: "The code works for 15 minutes.",
      ignore: "If you didn't create a DentVideo account, ignore this email — nothing will be sent to you again.",
      footer: "You get this email because this address was used to sign up on dentvideo.com.",
    },
  },
  de: {
    title: "E-Mail-Adresse bestätigen",
    lead: "Wir haben einen 6-stelligen Code an {email} gesendet. Geben Sie ihn ein, um Ihren Tarif zu wählen.",
    codeLabel: "6-stelliger Code",
    codeHint: "Nicht gefunden? Bitte prüfen Sie den Spam-Ordner. Der Code gilt 15 Minuten.",
    submit: "Bestätigen",
    checking: "Wird geprüft …",
    resend: "Neuen Code senden",
    resendIn: "Neuer Code in {s} s",
    resent: "Ein neuer Code ist unterwegs an {email}.",
    changeEmail: "E-Mail-Adresse ändern",
    newEmailLabel: "Ihre E-Mail-Adresse",
    saveEmail: "Code an diese Adresse senden",
    cancel: "Abbrechen",
    done: "E-Mail-Adresse bestätigt. Wählen Sie unten Ihren Tarif.",
    wrong: "Der Code stimmt nicht. Noch {n} Versuche.",
    expired: "Dieser Code ist abgelaufen. Fordern Sie einen neuen an.",
    locked: "Zu viele falsche Versuche. Fordern Sie einen neuen Code an.",
    none: "Für diese Adresse liegt kein Code vor. Fordern Sie einen neuen an.",
    malformed: "Geben Sie die 6 Ziffern aus der E-Mail ein.",
    emailTaken: "Diese E-Mail-Adresse wird bereits von einem anderen Konto verwendet.",
    failed: "Das hat nicht geklappt. Bitte versuchen Sie es gleich noch einmal.",
    checkoutBlocked: "Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse: Geben Sie den 6-stelligen Code ein, den wir Ihnen gesendet haben.",
    email: {
      subject: "{code} ist Ihr DentVideo-Code",
      hello: "Guten Tag,",
      body: "geben Sie diesen Code auf dentvideo.com ein, um Ihre E-Mail-Adresse zu bestätigen:",
      expires: "Der Code gilt 15 Minuten.",
      ignore: "Falls Sie kein DentVideo-Konto angelegt haben, ignorieren Sie diese E-Mail — Sie erhalten keine weiteren Nachrichten.",
      footer: "Sie erhalten diese E-Mail, weil diese Adresse auf dentvideo.com für eine Registrierung verwendet wurde.",
    },
  },
  es: {
    title: "Confirma tu correo",
    lead: "Hemos enviado un código de 6 dígitos a {email}. Escríbelo para elegir tu plan.",
    codeLabel: "Código de 6 dígitos",
    codeHint: "¿No lo encuentras? Revisa la carpeta de spam. El código es válido durante 15 minutos.",
    submit: "Confirmar",
    checking: "Comprobando…",
    resend: "Enviar un código nuevo",
    resendIn: "Código nuevo en {s} s",
    resent: "Un código nuevo va de camino a {email}.",
    changeEmail: "Cambiar el correo",
    newEmailLabel: "Tu correo electrónico",
    saveEmail: "Enviar el código aquí",
    cancel: "Cancelar",
    done: "Correo confirmado. Elige tu plan abajo.",
    wrong: "Ese código no coincide. Te quedan {n} intentos.",
    expired: "Este código ha caducado. Pide uno nuevo.",
    locked: "Demasiados intentos fallidos. Pide un código nuevo.",
    none: "No hay ningún código pendiente para este correo. Pide uno nuevo.",
    malformed: "Escribe los 6 dígitos del correo.",
    emailTaken: "Otra cuenta ya usa este correo.",
    failed: "No ha funcionado. Inténtalo de nuevo en un momento.",
    checkoutBlocked: "Primero confirma tu correo: escribe el código de 6 dígitos que te hemos enviado.",
    email: {
      subject: "{code} es tu código de DentVideo",
      hello: "Hola:",
      body: "Escribe este código en dentvideo.com para confirmar tu correo electrónico:",
      expires: "El código es válido durante 15 minutos.",
      ignore: "Si no has creado una cuenta de DentVideo, ignora este correo: no volverás a recibir nada.",
      footer: "Recibes este correo porque esta dirección se usó para registrarse en dentvideo.com.",
    },
  },
  tr: {
    title: "E-postanızı doğrulayın",
    lead: "{email} adresine 6 haneli bir kod gönderdik. Planınızı seçmek için kodu girin.",
    codeLabel: "6 haneli kod",
    codeHint: "Bulamadınız mı? Spam klasörünüze bakın. Kod 15 dakika geçerlidir.",
    submit: "Doğrula",
    checking: "Kontrol ediliyor…",
    resend: "Yeni kod gönder",
    resendIn: "{s} sn sonra yeni kod",
    resent: "Yeni kod {email} adresine gönderiliyor.",
    changeEmail: "E-postayı değiştir",
    newEmailLabel: "E-posta adresiniz",
    saveEmail: "Kodu bu adrese gönder",
    cancel: "Vazgeç",
    done: "E-posta doğrulandı. Aşağıdan planınızı seçin.",
    wrong: "Kod eşleşmiyor. {n} deneme hakkınız kaldı.",
    expired: "Bu kodun süresi doldu. Yeni bir kod isteyin.",
    locked: "Çok fazla hatalı deneme. Yeni bir kod isteyin.",
    none: "Bu adres için bekleyen bir kod yok. Yeni bir kod isteyin.",
    malformed: "E-postadaki 6 haneyi girin.",
    emailTaken: "Bu e-posta başka bir hesapta kullanılıyor.",
    failed: "Olmadı. Lütfen biraz sonra tekrar deneyin.",
    checkoutBlocked: "Önce e-postanızı doğrulayın: size gönderdiğimiz 6 haneli kodu girin.",
    email: {
      subject: "DentVideo kodunuz: {code}",
      hello: "Merhaba,",
      body: "E-posta adresinizi doğrulamak için bu kodu dentvideo.com'da girin:",
      expires: "Kod 15 dakika geçerlidir.",
      ignore: "DentVideo hesabı oluşturmadıysanız bu e-postayı yok sayın — size başka e-posta gönderilmez.",
      footer: "Bu e-postayı, bu adres dentvideo.com'da kayıt için kullanıldığı için alıyorsunuz.",
    },
  },
  fr: {
    title: "Confirmez votre e-mail",
    lead: "Nous avons envoyé un code à 6 chiffres à {email}. Saisissez-le pour choisir votre formule.",
    codeLabel: "Code à 6 chiffres",
    codeHint: "Introuvable ? Vérifiez vos spams. Le code est valable 15 minutes.",
    submit: "Confirmer",
    checking: "Vérification…",
    resend: "Envoyer un nouveau code",
    resendIn: "Nouveau code dans {s} s",
    resent: "Un nouveau code est en route vers {email}.",
    changeEmail: "Changer d'e-mail",
    newEmailLabel: "Votre adresse e-mail",
    saveEmail: "Envoyer le code ici",
    cancel: "Annuler",
    done: "E-mail confirmé. Choisissez votre formule ci-dessous.",
    wrong: "Ce code ne correspond pas. Encore {n} essais.",
    expired: "Ce code a expiré. Demandez-en un nouveau.",
    locked: "Trop d'essais erronés. Demandez un nouveau code.",
    none: "Aucun code en attente pour cette adresse. Demandez-en un nouveau.",
    malformed: "Saisissez les 6 chiffres reçus par e-mail.",
    emailTaken: "Un autre compte utilise déjà cet e-mail.",
    failed: "Cela n'a pas fonctionné. Réessayez dans un instant.",
    checkoutBlocked: "Confirmez d'abord votre e-mail : saisissez le code à 6 chiffres que nous vous avons envoyé.",
    email: {
      subject: "{code} est votre code DentVideo",
      hello: "Bonjour,",
      body: "Saisissez ce code sur dentvideo.com pour confirmer votre adresse e-mail :",
      expires: "Le code est valable 15 minutes.",
      ignore: "Si vous n'avez pas créé de compte DentVideo, ignorez cet e-mail — vous ne recevrez rien d'autre.",
      footer: "Vous recevez cet e-mail car cette adresse a servi à créer un compte sur dentvideo.com.",
    },
  },
  ja: {
    title: "メールアドレスの確認",
    lead: "{email} に6桁の確認コードをお送りしました。コードを入力すると、プランを選べます。",
    codeLabel: "6桁の確認コード",
    codeHint: "見つからない場合は迷惑メールフォルダをご確認ください。コードの有効期限は15分です。",
    submit: "確認する",
    checking: "確認中…",
    resend: "コードを再送する",
    resendIn: "{s}秒後に再送できます",
    resent: "{email} に新しいコードをお送りしました。",
    changeEmail: "メールアドレスを変更",
    newEmailLabel: "メールアドレス",
    saveEmail: "このアドレスに送る",
    cancel: "キャンセル",
    done: "メールアドレスを確認しました。下からプランをお選びください。",
    wrong: "コードが一致しません。あと{n}回入力できます。",
    expired: "このコードは有効期限が切れています。新しいコードをお送りください。",
    locked: "入力の誤りが多すぎます。新しいコードをお送りください。",
    none: "このアドレスに有効なコードがありません。新しいコードをお送りください。",
    malformed: "メールに記載の6桁の数字を入力してください。",
    emailTaken: "このメールアドレスは別のアカウントで使われています。",
    failed: "うまくいきませんでした。少し時間をおいて、もう一度お試しください。",
    checkoutBlocked: "先にメールアドレスの確認をお願いします。お送りした6桁のコードを入力してください。",
    email: {
      subject: "DentVideoの確認コード：{code}",
      hello: "DentVideoをご利用いただきありがとうございます。",
      body: "dentvideo.com で次のコードを入力し、メールアドレスの確認を完了してください。",
      expires: "このコードの有効期限は15分です。",
      ignore: "DentVideoのアカウントを作成した覚えがない場合は、このメールを破棄してください。今後メールが届くことはありません。",
      footer: "このメールは、dentvideo.com の登録にこのアドレスが使われたためお送りしています。",
    },
  },
  ar: {
    title: "أكّدوا بريدكم الإلكتروني",
    lead: "أرسلنا رمزاً من 6 أرقام إلى {email}. أدخلوه لاختيار خطتكم.",
    codeLabel: "الرمز المكوّن من 6 أرقام",
    codeHint: "لم تجدوه؟ تحقّقوا من مجلد الرسائل غير المرغوب فيها. الرمز صالح لمدة 15 دقيقة.",
    submit: "تأكيد",
    checking: "جارٍ التحقق…",
    resend: "إرسال رمز جديد",
    resendIn: "رمز جديد بعد {s} ث",
    resent: "رمز جديد في طريقه إلى {email}.",
    changeEmail: "تغيير البريد الإلكتروني",
    newEmailLabel: "بريدكم الإلكتروني",
    saveEmail: "أرسلوا الرمز إلى هذا العنوان",
    cancel: "إلغاء",
    done: "تم تأكيد البريد الإلكتروني. اختاروا خطتكم أدناه.",
    wrong: "الرمز غير صحيح. المحاولات المتبقية: {n}.",
    expired: "انتهت صلاحية هذا الرمز. اطلبوا رمزاً جديداً.",
    locked: "محاولات خاطئة كثيرة. اطلبوا رمزاً جديداً.",
    none: "لا يوجد رمز بانتظار هذا العنوان. اطلبوا رمزاً جديداً.",
    malformed: "أدخلوا الأرقام الستة الواردة في الرسالة.",
    emailTaken: "هذا البريد الإلكتروني مستخدم في حساب آخر.",
    failed: "لم ينجح ذلك. يُرجى المحاولة مجدداً بعد قليل.",
    checkoutBlocked: "يُرجى تأكيد بريدكم الإلكتروني أولاً: أدخلوا الرمز المكوّن من 6 أرقام الذي أرسلناه إليكم.",
    email: {
      subject: "رمز DentVideo الخاص بكم: {code}",
      hello: "مرحباً،",
      body: "أدخلوا هذا الرمز على dentvideo.com لتأكيد بريدكم الإلكتروني:",
      expires: "الرمز صالح لمدة 15 دقيقة.",
      ignore: "إن لم تُنشئوا حساباً على DentVideo فتجاهلوا هذه الرسالة، ولن تصلكم رسائل أخرى.",
      footer: "تصلكم هذه الرسالة لأن هذا العنوان استُخدم للتسجيل على dentvideo.com.",
    },
  },
  pl: {
    title: "Potwierdź adres e-mail",
    lead: "Wysłaliśmy 6-cyfrowy kod na adres {email}. Wpisz go, aby wybrać plan.",
    codeLabel: "6-cyfrowy kod",
    codeHint: "Nie widzisz go? Sprawdź folder spam. Kod jest ważny przez 15 minut.",
    submit: "Potwierdź",
    checking: "Sprawdzanie…",
    resend: "Wyślij nowy kod",
    resendIn: "Nowy kod za {s} s",
    resent: "Nowy kod jest w drodze na adres {email}.",
    changeEmail: "Zmień adres e-mail",
    newEmailLabel: "Twój adres e-mail",
    saveEmail: "Wyślij kod na ten adres",
    cancel: "Anuluj",
    done: "Adres e-mail potwierdzony. Wybierz plan poniżej.",
    wrong: "Kod się nie zgadza. Pozostałe próby: {n}.",
    expired: "Ten kod wygasł. Poproś o nowy.",
    locked: "Zbyt wiele błędnych prób. Poproś o nowy kod.",
    none: "Dla tego adresu nie czeka żaden kod. Poproś o nowy.",
    malformed: "Wpisz 6 cyfr z wiadomości e-mail.",
    emailTaken: "Ten adres e-mail jest już używany przez inne konto.",
    failed: "Nie udało się. Spróbuj ponownie za chwilę.",
    checkoutBlocked: "Najpierw potwierdź adres e-mail: wpisz 6-cyfrowy kod, który wysłaliśmy.",
    email: {
      subject: "{code} to Twój kod DentVideo",
      hello: "Dzień dobry,",
      body: "wpisz ten kod na dentvideo.com, aby potwierdzić swój adres e-mail:",
      expires: "Kod jest ważny przez 15 minut.",
      ignore: "Jeśli nie zakładałeś konta w DentVideo, zignoruj tę wiadomość — nie wyślemy Ci nic więcej.",
      footer: "Otrzymujesz tę wiadomość, ponieważ ten adres został użyty do rejestracji na dentvideo.com.",
    },
  },
};

export const VERIFY_COPY: Readonly<Record<Locale, VerifyCopy>> = VERIFY;

export function verifyText(locale: string | undefined | null): VerifyCopy {
  return (VERIFY as Record<string, VerifyCopy>)[(locale ?? "en").slice(0, 2)] ?? VERIFY.en;
}

/** "{email}" → value. Placeholders without a value stay as they are. */
export function fmtAuth(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}
