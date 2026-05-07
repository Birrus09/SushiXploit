# SushiXploit Order App

A simple LAN-friendly Sushi restaurant order application.

## Features

- `GET /auth_create` shows a page to select a table and creates a unique code stored in a browser cookie.
- `GET /` shows an interactive ordering page if authorized, with buttons and placeholder images for sushi types.
- Order submission is via `POST /order/:tableId` with JSON body, handled by JavaScript fetch.
- Only requests from the same IP and cookie code can order for the selected table.
- Successful orders are added to ORDERS list as [type, count] tuples.
- Server listens on `0.0.0.0` so it is reachable on the LAN.

## Install

1. Open a terminal in this folder.
2. Run `npm install`.

## Run

`npm start`

## Usage

1. Browse to `http://<server-ip>:3000/auth_create`.
2. Enter a table number.
3. The authorization code is automatically stored in your browser cookie.
4. Browse to `http://<server-ip>:3000/` to see the ordering interface.
5. Select quantities and click order buttons for different sushi types.
6. Orders are sent automatically and responses are shown on the page.
