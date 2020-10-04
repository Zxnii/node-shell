const process = require("process")

process.stdout.write("What's your name? ")

process.stdin.on("data", (chunk) => {
    chunk = chunk.toString()
    process.stdout.write(`Hi, ${chunk}`)
    process.exit(0)
})