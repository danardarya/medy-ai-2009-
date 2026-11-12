# MEDY AI

Web app responsive per telefono e PC, con interfaccia nero/argento luxury.

## Incluso
- Registrazione e accesso con password protetta
- Database SQLite per account e cronologia
- MEDY Chat tramite API OpenAI
- MEDY Image tramite API OpenAI
- MEDY Video: interfaccia e salvataggio richieste; manca il collegamento a un provider video
- MEDY Studio: upload file (max 12 MB), workspace predisposto
- Cronologia personale e impostazioni account

## Avvio
1. Installa Node.js 20 o superiore.
2. Estrai il pacchetto.
3. Nella cartella esegui `npm install`.
4. Copia `.env.example` in `.env`.
5. Inserisci una chiave API in `OPENAI_API_KEY` e cambia `JWT_SECRET` con una stringa casuale lunga.
6. Esegui `npm start`.
7. Apri `http://localhost:3000`.

## Pubblicazione
Carica la cartella su un hosting/VPS che supporti Node.js 20+, imposta le variabili d'ambiente e avvia `npm start`. Mantieni persistente la cartella del database `medy-ai.sqlite` e abilita HTTPS.

## Da completare per il servizio completo
- MEDY Video: scegliere e collegare un provider video compatibile e configurare la sua API key.
- MEDY Studio: collegare un provider di editing immagini/video per applicare modifiche ai file caricati.
- Configurare dominio, hosting, HTTPS e chiavi API. Questi accessi non sono inclusi nel pacchetto.

Non inserire chiavi API nel frontend. Le chiavi vanno solo nel file `.env` o nelle variabili segrete dell'hosting.
