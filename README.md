# Household budget

A shared budget for two people, using the MoneySmart categories. Essentials (non-discretionary spending), discretionary spending, and money set aside are kept separate.

The repository ships with every amount blank. The figures you type are stored only in the SQLite file on the machine that runs the app. That file is not part of the git history or the image build.

## Use it

Open the budget. The figure at the top is what is left after essentials, for the period you pick: weekly, fortnightly, monthly, quarterly, or annually.

- Type an amount and choose how often it is paid. Periods match the MoneySmart sheet: 52 weeks, 26 fortnights, 12 months, 4 quarters, 1 year.
- A blank amount is ignored. Zero means you entered zero.
- Essentials are the non-discretionary lines. Drag a line by its handle into another group, or use the row menu to move it.
- The bars split every filled line into its own colour. Each figure shows its share of income. Hover a colour to see that line.
- Savings and extra super sit under **Set aside**. They reduce what is left over, and they are not counted as spending.
- Discretionary lines (eating out, holidays, clothing, pay TV, and similar) stay tucked away until you open them.
- Add a line, rename one, or hide one you do not use. Added lines can be removed. Built-in lines can be hidden and restored.
- The first visit asks you to create a shared login. After that, sign in to see the figures. Change the password from the budget page, or set `BUDGET_PASSWORD` on the container instead.
- Use the colour control for light or dark.
- **Export** opens the advisor pack: fortnightly, monthly, and annual figures, a note, an **Export spreadsheet** download, and **Export as PDF**. The spreadsheet is `household-budget.csv`.

This is a plan, the same kind of snapshot as the MoneySmart sheet. It does not import bank transactions or compare a month with what you actually spent.

## Install it on Unraid

Use the Docker page. A container started with `docker compose` from the terminal is outside that page: it has no WebUI link, Check for Updates does not see it, and a later install from the GUI can collide with it.

The image is published from this repository to `ghcr.io/matda59/spend-smart`. Unraid pulls that image. Your figures stay in a folder on the array.

If a copy is already running from the terminal, open the Docker tab, stop that container, and remove it before adding this one. Leave the appdata folder if you want to keep figures you already typed.

1. Open the **Docker** tab and click **Add Container**.
2. Switch to the advanced view if you want the icon and WebUI fields. Set:
   - **Name:** `spend-smart`
   - **Repository:** `ghcr.io/matda59/spend-smart:latest`
   - **Icon URL:** `https://raw.githubusercontent.com/matda59/spend-smart/main/unraid/icon.png`
   - **WebUI:** `http://[IP]:[PORT:3847]/`
   - **Network Type:** Bridge
3. **Add another Path, Port, Variable, Label or Device.**
   - Port. Container port `3847`, host port `3847`, TCP.
   - Path. Container path `/data`, host path `/mnt/user/appdata/spend-smart`, read/write.
   - Variable, optional. Name `BUDGET_PASSWORD`, value a passphrase. Leave it out to set the passphrase in the app.
4. Click **Apply**. Unraid pulls the image and starts the container. Open it from the WebUI icon.

The same fields are in `unraid/spend-smart.xml` if you keep your own templates. Unraid stores the container you create under the Docker tab, linked to that image repository.

### Updates

On the Docker tab, click **Check for Updates**. When this repository publishes a new image, that container shows **Update**. Applying it replaces the program and leaves `/mnt/user/appdata/spend-smart` in place. Back that folder up with the rest of your appdata.

To clear a forgotten passphrase that was set inside the app, edit the container, add a variable named `BUDGET_RESET_PASSWORD` with the value `1`, apply it once, then remove that variable and apply again. A passphrase set with `BUDGET_PASSWORD` is cleared by editing that variable.

## Run it locally

Node.js 22 is required.

```bash
npm install
npm test
npm run dev
```

The dev server listens on port **3847**. Production mode is `npm run build` and `npm start`. The database file is `data/budget.sqlite`, and it is gitignored.
