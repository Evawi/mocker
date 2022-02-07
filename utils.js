const fs = require('fs')

function formatDate(date) {
  const [day, month, year, hours, minutes, seconds] = [
    date.getDate(), date.getMonth() + 1, date.getFullYear(),
    date.getHours(), date.getMinutes(), date.getSeconds()
  ].map(value => String(value).padStart(2, '0'))
  return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`
}

function getFormattedWSLog(realRequest, mockRequest = {}) {
  const { mockResponse, ...mockSettings } = mockRequest
  const responseText = mockResponse === undefined
    ? 'Response is not set'
    : `Response: ${JSON.stringify(mockResponse)}`
  return (
`Last request to the mock WebSocket server

Time:
${formatDate(new Date())}

Real request:
${JSON.stringify(realRequest)}

Mock request:
Settings: ${JSON.stringify(mockSettings)}
${responseText}`
  )
}

// WARN: Argument `dir` must NOT begin or end with the `/` char
// `dir` is a relative path, starting with the current directory
function writeToFile(dir, filename, content, onError) {
  const dirPath = __dirname + '/' + dir + '/'
  if (!fs.existsSync(dir)) fs.mkdirSync(dirPath, { recursive: true })
  fs.writeFile(dirPath + filename, content, 'utf8', onError || ((err) => {
    if (err) return console.log('Couldn\'t write file:', err.message)
  }))
}

module.exports = {
  getFormattedWSLog,
  writeToFile
}
