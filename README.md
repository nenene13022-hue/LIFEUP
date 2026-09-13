# LifeUp — החיים שלך. בשליטה שלך.

עוזר אישי חכם לניהול כסף, הוצאות ויעדים. אפליקציית Web מודרנית (React + TypeScript + Vite + Tailwind), מובייל-פירסט, RTL מלא ועברית מלאה, שבנויה כ-**PWA** — כלומר אפשר להתקין אותה על מסך הבית באייפון/אנדרואיד כמו אפליקציה אמיתית, בלי Xcode ובלי App Store.

## הרצה מקומית

דרוש [Node.js](https://nodejs.org) גרסה 18 ומעלה.

```bash
npm install
npm run dev
```

האפליקציה תיפתח בכתובת `http://localhost:5173`.

## בנייה לפרודקשן

```bash
npm run build
npm run preview   # לבדיקה מקומית של גרסת הפרודקשן
```

התוצר יימצא בתיקיית `dist/`.

## איך מתקינים את זה על אייפון (כמו אפליקציה)

חשוב: כדי ש-iOS יאפשר "התקנה" אמיתית (PWA), האתר **חייב לרוץ על HTTPS** (לא על localhost של המחשב שלך — האייפון לא יכול לגשת אליו). הדרך הכי מהירה:

1. העלה את הפרויקט ל-GitHub (ראה למטה).
2. חבר את הריפו ל-[Vercel](https://vercel.com) או [Netlify](https://netlify.com) — שניהם מזהים אוטומטית פרויקט Vite, ותוך דקה מקבלים כתובת `https://...` חינמית.
3. פתח את הכתובת הזו ב**ספארי** באייפון (חובה ספארי, לא כרום).
4. הקש על כפתור השיתוף (הריבוע עם החץ) ← **"הוסף למסך הבית"**.
5. האפליקציה תופיע עם האייקון והשם שלה כמו כל אפליקציה אחרת, במסך מלא (בלי סרגל הכתובת של ספארי).

## איך מעלים ל-GitHub

1. צור ריפו חדש וריק ב-[github.com/new](https://github.com/new) (בלי README/gitignore — הם כבר קיימים כאן).
2. פתח טרמינל בתיקיית הפרויקט והרץ:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<username>/<repo-name>.git
git push -u origin main
```

(אם אתה מעלה ידנית דרך האתר — פשוט גרור את כל תוכן התיקייה, **חוץ מ-`node_modules`**, לעמוד ה-upload של GitHub.)

## בהמשך — הפיכה לאפליקציית iOS "אמיתית" (App Store)

הגרסה הנוכחית היא PWA — עובדת מצוין להתקנה אישית על מסך הבית, אבל לא ניתן להעלות אותה בעצמה ל-App Store. אם בעתיד יהיה זמין Mac עם Xcode (או שירות ענן כמו Ionic Appflow / Codemagic שבונה iOS בלי Mac), אפשר לעטוף את אותו קוד בדיוק עם [Capacitor](https://capacitorjs.com):

```bash
npm install @capacitor/core @capacitor/ios
npx cap init
npx cap add ios
npm run build
npx cap sync
npx cap open ios   # פותח ב-Xcode
```

כל הלוגיקה העסקית (מנוע החישובים, ה-DB, ה-AI) כתובה בנפרד מה-UI בדיוק כדי שהמעבר הזה יהיה פשוט ולא ידרוש שכתוב.

## ארכיטקטורה

```
src/
  components/    רכיבי UI משותפים (Card, Button, BottomNav, Sheet...)
  features/      מסכי האפליקציה לפי תחום (onboarding, dashboard, goals, expenses, ai...)
  lib/
    db/          שכבת נתונים — IndexedDB + repositories
    calc/        מנוע החישובים הפיננסי
    ai/          מנוע ה-AI (מבוסס חוקים, ללא API חיצוני)
    types/       טיפוסי TypeScript
  state/         Zustand store מרכזי
```

## מגבלות גרסה נוכחית (MVP)

- הרשמה עם Google/Apple היא placeholder בלבד (אין backend OAuth).
- כל הנתונים נשמרים מקומית בדפדפן (IndexedDB) — אין שרת, אין חיבור בנק.
- ה-AI הוא מנוע חוקים חכם שמשתמש בנתוני האמת שלך, לא מודל שפה חיצוני.
- מסך Premium הוא תצוגה בלבד, ללא תשלום אמיתי.
