# Bitgreen Carbon API

### Requirements
You need the following in order to run this API:
- Nodejs & npm
- Postgresql

### Installation
Clone this repo and install packages via npm.
```
npm install
cp .env.example .env    #create .env from example
nano .env               #enter your database info & save
```
Create DB tables, and optionally run seed script:
```
npx prisma db push
npx prisma db seed      #optional
```
Starting API server, you can define port at `.env` file. Default port is `3000`.
```
npm run start
```

To run fetcher, run the following command: `#wip`
```
npm run fetcher
```

### API Docs
___
#### Route: `GET` `/nodes`
*Returns: List of all nodes.*  
#### Params:  
- `network` Network name to query. Example: **POLKADOT**. Leaving the field blank will show all the nodes.  
- `type` Type of node. Leaving the field blank will show all the nodes. Possible values: **validator** and **node**.  
___
#### Route: `GET` `/periods`
*Returns: Each period monitored with nodes seed within that period.*
#### Params:
- `network` Network name to query. Example: **POLKADOT**. Leaving the field blank will show all the nodes.
- `type` Type of node. Leaving the field blank will show all the nodes. Possible values: **validator** and **node**.
___
#### Route: `GET` `/report/daily`  
Returns: Daily report of nodes seen.