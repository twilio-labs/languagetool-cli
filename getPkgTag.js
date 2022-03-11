process.stdout.write(
  require("./package.json").version.includes("-") ? "next" : "latest"
);
