// Masters public/raw.wav to public/soundtrack.wav at -12 LUFS / -1 dBTP with a
// two-pass loudnorm, then prints the measured result. Checked by measurement,
// not by ear.
import { execFileSync, spawnSync } from "node:child_process";

const raw = new URL("../public/raw.wav", import.meta.url).pathname;
const out = new URL("../public/soundtrack.wav", import.meta.url).pathname;
const target = "I=-12:TP=-1:LRA=9";

const ffmpegStderr = (args: string[]) =>
  spawnSync("ffmpeg", ["-hide_banner", "-nostats", ...args], { encoding: "utf8" }).stderr;

const pass1 = ffmpegStderr(["-i", raw, "-af", `loudnorm=${target}:print_format=json`, "-f", "null", "-"]);
const json = pass1.slice(pass1.lastIndexOf("{"));
const m = JSON.parse(json.slice(0, json.indexOf("}") + 1));
const pass2 = `loudnorm=${target}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
execFileSync("ffmpeg", ["-hide_banner", "-y", "-loglevel", "error", "-i", raw, "-af", pass2, "-ar", "48000", "-c:a", "pcm_s24le", out]);

const summary = ffmpegStderr(["-i", out, "-af", "ebur128=peak=true", "-f", "null", "-"]);
console.log(summary.slice(summary.lastIndexOf("Summary:")));
