# Cheese Log: setup (about 20 minutes, once)

You need: a Google account, a free Netlify account, a computer for steps 1–2, and your phone for step 3.

The folder has two parts:

- `google-sheet/Code.gs`: a small script that lives inside your Google Sheet and writes the rows.
- `app/`: the phone app (a web app you install to your home screen).

---

## 1. Make the Google Sheet (computer)

1. Go to sheets.google.com and create a blank sheet. Name it "יומן גבינות".
2. Menu **Extensions → Apps Script**. A code editor opens.
3. Delete everything in the editor. Open `google-sheet/Code.gs` from this folder, copy all of it, and paste it in.
4. On the line `const SECRET = 'change-me';` change `change-me` to a private word of your own, e.g. `brie-7731`. Keep the quotes.
5. Click **Save** (the disk icon).
6. Click **Deploy → New deployment**. Click the gear next to "Select type" and choose **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
7. Click **Deploy**, then **Authorize access** and pick your Google account.
   Google warns "Google hasn't verified this app". That is normal for your own script: click **Advanced → Go to … (unsafe) → Allow**.
8. Copy the **Web app URL** (it ends in `/exec`). You'll paste it into the phone.

"Anyone" means anyone who has that long URL **and** your secret word. Without the word the script refuses.

If you ever change the code: **Deploy → Manage deployments → ✎ → Version: New version → Deploy**. The URL stays the same.

## 2. Put the app online (computer)

The microphone and "install to home screen" only work from a secure (https) web address, so the app needs free hosting.

1. Go to app.netlify.com and sign up (the "Sign up with Google" button is fine).
2. Choose **Add new site → Deploy manually**.
3. Drag the **`app` folder** (not the whole zip) onto the page.
4. After a few seconds you get an address like `https://random-name-123.netlify.app`.
   Optional: **Site configuration → Change site name** to something like `my-cheese-log`.

## 3. Install it on the Galaxy A57 (phone)

1. Open **Chrome** on the phone and go to your Netlify address.
2. Tap the **⋮** menu → **Add to home screen** (or **Install app**) → **Install**.
3. Open "יומן גבינות" from the home screen. The settings panel opens:
   - Paste the **Web app URL** from step 1.8.
   - Type your **secret word** from step 1.4.
   - Tap **שמור ובדוק חיבור**. It should say "מחובר. הגיליון מוכן." and an "אצוות" tab appears in your sheet.
4. Tap the big microphone and **allow microphone access**.

## 4. First test (2 minutes, at the kitchen counter)

Say each line, pausing after each one:

1. "התחל" → a new tab **#23 · date** appears in the sheet.
2. "עדכון 32 מעלות הוספתי מחמצת" → row with 32 in the temperature column.
3. "עדכון 2.5 מיליליטר רנט" → row with 2.5 ml.
4. "טיימר 1 דקות בדיקה" → alarm after a minute, row logged.
5. "בטל" → last row removed.
6. "שם בדיקה" → the batch gets a name.
7. "סיים הקלטה" → the batch closes.

Then delete the test tab in the sheet. To start numbering at 23 again: in Apps Script, **Project Settings → Script properties**, delete `next`.

## Good to know

- **Only sentences that start with a command are logged.** Kitchen chat is ignored.
- **The screen stays on** while the microphone is on. Keep the phone on a charger for long batches.
- **No connection?** Notes wait on the phone and are sent automatically. The line under the header says how many are waiting.
- **Chrome may beep** each time it restarts listening after a silence. That's Android; turning down the phone's notification volume helps.
- **Typing works too**: the text box and the התחל אצווה / סיים הקלטה buttons do the same as your voice.
- **Late remarks**: when nothing is recording, pick a batch from the list and say "עדכון …", or type in the **הערות** column of that batch's tab.
- **Excel**: in Google Sheets, File → Download → Microsoft Excel (.xlsx).
- **Batch summary** (milk, final weight, rating, tasting notes): fill it at the top of each batch tab. The אצוות index updates by itself.
