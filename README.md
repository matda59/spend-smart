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

## Build the container on Unraid

There is no image to pull in the Unraid Docker tab. The server builds the container from this repository. Your figures are written only to a file on the Unraid array.

Open the Unraid web terminal (the `>_` button) or SSH in as root, then paste:

```bash
curl -fsSL https://downloads.cursor.com/origin/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"
origin auth login
mkdir -p /mnt/user/appdata
cd /mnt/user/appdata
origin repo clone matda59/spend-smart
cd spend-smart
docker compose up -d --build
```

`origin auth login` prints a link. Open that link on your computer and approve it. The terminal on Unraid then continues, clones the repository, and builds the container. The first build takes a few minutes. It does not download a pre-made image.

When it finishes, open `http://<your-unraid-ip>:3847`.

This repository is private to your Cursor account. Origin does not offer a public setting for a personal repository, so Unraid signs in once with `origin auth login` and can pull after that.

To update later, from the same folder:

```bash
cd /mnt/user/appdata/spend-smart
git pull
docker compose up -d --build
```

That rebuilds the container. It does not replace `data/budget.sqlite`.

The budget is stored at:

`/mnt/user/appdata/spend-smart/data/budget.sqlite`

That file is created on first start. Rebuilding or updating the container leaves it in place. Back it up with the rest of your appdata. Do not commit it.

Before the page is reachable beyond your house, set a passphrase in `docker-compose.yml`:

```yaml
BUDGET_PASSWORD: "choose-a-long-passphrase"
```

Then run `docker compose up -d` again from the same folder.

If `docker compose` is not found, install **Compose Manager** from Community Applications and run the `docker compose` command again.

If `origin` is not found after install:

```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

To clear a forgotten passphrase that was set inside the app, stop the container, set `BUDGET_RESET_PASSWORD=1`, start it once, then remove that variable and start it again. A passphrase set with `BUDGET_PASSWORD` is cleared by editing that variable.

## Run it locally

Node.js 22 is required.

```bash
npm install
npm test
npm run dev
```

The dev server listens on port **3847**. Production mode is `npm run build` and `npm start`. The database file is `data/budget.sqlite`, and it is gitignored.
