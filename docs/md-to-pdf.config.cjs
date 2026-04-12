/**
 * Config for md-to-pdf when building the client-facing mobile features PDF.
 *
 * Run from repo: `showgroundlive_frontend` — see package.json script `docs:client-pdf`.
 */
const path = require("path");

module.exports = {
  /** Serve images under docs/screenshots/ at the same paths used in the .md file */
  basedir: __dirname,
  /** Client/shareable PDF output (same folder as the source .md). */
  dest: path.join(__dirname, "feature_documentation.pdf"),
  stylesheet: [path.join(__dirname, "pdf-print.css")],
  pdf_options: {
    format: "A4",
    printBackground: true,
    margin: {
      top: "14mm",
      right: "12mm",
      bottom: "14mm",
      left: "12mm",
    },
  },
};
