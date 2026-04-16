import streamDeck from "@elgato/streamdeck";
import { RunCommandAction } from "./actions/run-command";

streamDeck.logger.setLevel("info");
streamDeck.actions.registerAction(new RunCommandAction());
streamDeck.connect();
