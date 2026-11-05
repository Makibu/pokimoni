import {config} from "zod";

// Otherwise zod probes for `new Function` when a schema is created. It catches the error, but the browser still
// reports each probe as a violation of the Content Security Policy. Schemas read this when they are created, so every
// file defining one imports this module first. It sits apart from `z` so that unused parts of zod can still be dropped.
config({jitless: true});
