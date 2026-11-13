# Household budget

A shared budget for two people, using the MoneySmart categories. Essentials (non-discretionary spending), discretionary spending, and money set aside are kept separate.

The repository ships with every amount blank. The figures you type are stored only in the SQLite file on the machine that runs the app. That file is not part of the git history or the image build.

## Use it

Open the budget. The figure at the top is what is left after essentials, for the period you pick: weekly, fortnightly, monthly, quarterly, or annually.

- Type an amount and choose how often it is paid. Periods match the MoneySmart sheet: 52 weeks, 26 fortnights, 12 months, 4 quarters, 1 year.
- A blank amount is ignored. Zero means you entered zero.
- Essentials are the non-discretionary lines. Use the row menu to move a line to discretionary or set aside.
- Savings and extra super sit under **Set aside**. They reduce what is left over, and they are not counted as spending.
- Discretionary lines (eating out, holidays, clothing, pay TV, and similar) stay tucked away until you open them.
- Add a line, rename one, or hide one you do not use. Added lines can be removed. Built-in lines can be hidden and restored.

Anyone who can open the address can edit the budget until you set a passphrase. Set one in the app, or set `BUDGET_PASSWORD` on the container before the app is reachable beyond the house.

This is a plan, the same kind of snapshot as the MoneySmart sheet. It does not import bank transactions or compare a month with what you actually spent.

## Run it on Unraid

Unraid cannot pull an image of this app. Copy this repository onto the server and build it there. The personal figures never need to leave that machine.

In Unraid, install the Compose plugin if you do not already have it. Put the repository in a folder such as `/mnt/user/appdata/household-budget`.

```yaml
services:
  household:
    build: .
    image: household-budget
    ports:
      - "3847:3847"
    environment:
      DATABASE_PATH: /data/budget.sqlite
      # BUDGET_PASSWORD: "choose-a-long-passphrase"
    volumes:
      - /mnt/user/appdata/household-budget/data:/data
    restart: unless-stopped
```

Keep the source folder and the `data` folder separate. The database file is `/mnt/user/appdata/household-budget/data/budget.sqlite`. Back that file up with the rest of your appdata. Do not copy it back into the git repository.

From the source folder:

```bash
docker compose up -d --build
```

Open `http://<your-unraid-ip>:3847`.

The first start creates an empty MoneySmart budget. Later starts keep whatever you have edited. Rebuilding the container does not wipe the database, because it lives on the volume.

To clear a forgotten passphrase that was set inside the app, stop the container, set `BUDGET_RESET_PASSWORD=1`, start it once, then remove that variable and start it again. A passphrase set with `BUDGET_PASSWORD` is cleared by editing that variable.

## Run it locally

Node.js 22 is required.

```bash
npm install
npm test
npm run dev
```

The dev server listens on port **3847**. Production mode is `npm run build` and `npm start`. The database file is `data/budget.sqlite`, and it is gitignored.
