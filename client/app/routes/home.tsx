import type { Route } from "./+types/home";
import  Board  from "../boards/TicTacToeBoard";
import { ClientOnly } from "remix-utils/client-only";
import type { LinksFunction } from "@remix-run/node";

// Exporting the links function to apply styles. Why?
export const links: LinksFunction = () => [
  { rel: "stylesheet", href: "/app.css" },
];

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Interactive Board" },
    { name: "description", content: "Interactive drawing board with Konva" },
  ];
}

export default function Home() {
  return (
    <>
    <p>This is the starting point. A simple neural network with.. </p>
    <ClientOnly fallback={<div>Loading...</div>}>
      {() => <Board />}
    </ClientOnly>
    </>
  );
}
