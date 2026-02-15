const path = require('path');
const fs = require('fs');

const getLatestVersion = (req, res) => {
  try {
    const pkgPath = path.resolve(__dirname, '../../../web/package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

    res.json({
      version: pkg.version,
      downloadUrl: '/download'
    });
  } catch {
    res.status(500).json({ error: 'Could not read version info' });
  }
};

module.exports = { getLatestVersion };
