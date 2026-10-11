# Receptor Dome Atlas

**[kuhfeldrf.github.io/receptor-dome-atlas](https://kuhfeldrf.github.io/receptor-dome-atlas/)**

Receptors on gastrointestinal enteroendocrine cells (EECs) and the endogenous peptides
that act on them, organised by **where things are on the cell** rather than by receptor
family or peptide precursor.

A luminal peptide can only reach the narrow apical neck. Everything below the tight
junction meets interstitial fluid, not digesta. Sorting the literature by position makes
that constraint visible, and makes the missing experiments visible with it.

## What is in it

| Register | Count |
|---|---|
| Receptors, placed by position | 204 |
| Secreted peptides | 189 |
| Luminal peptides | 34 |
| Orphan peptides (no known receptor) | 34 |
| Enteroendocrine subtypes | 11 |
| Cross-reference links (receptor ↔ peptide) | 273 |

Three axes are graded **separately**, because they fail independently:

- **Position** — apical neck, basolateral face, inside the cell, off the EEC entirely.
  Seven zones. **129 of the 204 receptors have never had their membrane face tested**, and
  23 are demonstrated apical against 23 demonstrated basolateral. That ratio is the state
  of the field, not a gap in this compilation — no database records membrane polarity.
- **Evidence grade A–F** — how well the entry's central claim is established. This scale
  is a construction specific to this atlas. It is **not GRADE and not Oxford CEBM**.
- **Secretion coupling** — whether activation is known to change hormone output.

Each receptor card also carries its experimental structures: every PDB entry from
UniProt's cross-references, with method and resolution, sorted best-first.

## Data

| File | Rows | What it is |
|---|---|---|
| `data/pdb_resolutions.tsv` | 2,603 | `accession · pdb_id · method · resolution_angstrom` for all 232 UniProt accessions on the receptor cards. Resolution is `NA` where UniProt records none (48 NMR structures, plus PIGR `2OCW`, deposited as `X-ray; -;`). Predicted models are deliberately excluded. |
| `data/hpa_eec_v24.tsv` | 286 | `gene · ensembl · tier · ntpm` — the genes Human Protein Atlas **v24.1** classifies as enteroendocrine enriched, group-enriched or enhanced. |

### A version trap worth knowing about

The current HPA release **removed the "Enteroendocrine cells" cell type**, folding it into
"Neuroendocrine cells". Every expression figure here comes from **v24.1**
(`v24.proteinatlas.org`), which still resolves it. Re-running any of this against the
current release returns nothing for this cell type, and does so silently.

## Verifying it

```sh
node validate.js
```

No dependencies, Node 16+. It parses `index.html`, pulls the data blocks out of the page,
and **re-derives** every published structure figure from `data/pdb_resolutions.tsv` —
rebuilding all 203 resolvable receptor cards record by record, checking that every card
with an accession has a row and vice versa, and confirming the histogram bins partition
the cards at every threshold. It prints the numbers it found rather than the numbers the
page claims, and exits non-zero on any disagreement.

## Sources

- [UniProtKB](https://www.uniprot.org/) — sequences, PDB cross-references, method and resolution
- [IUPHAR/BPS Guide to PHARMACOLOGY](https://www.guidetopharmacology.org/), release 2026.3 — endogenous ligand pairings, affinities, G-protein coupling
- [Human Protein Atlas v24.1](https://v24.proteinatlas.org/) — single-cell RNA, enteroendocrine cluster
- [NeuroPep 2.0](http://isyslab.info/NeuroPeptide/) — independent sequence confirmation
- [RCSB PDB](https://www.rcsb.org/) — structure links
- Beumer et al., *Science* 386:341 (2024); Lei et al., *bioRxiv* 2024.10.29.620704

## How to read this, and how not to

This is a **curated synthesis assembled by an AI system** working from public databases and
a small number of primary papers. It is not peer reviewed, it is not a primary source, and
it should not be cited as an authority. Cite the primary sources, which every card gives
you. The page's own "How to read this atlas, and how not to" section states the limits in
full, including the ones that are uncomfortable: the retrieval layer used to build it had a
non-zero error rate, every sequence was therefore re-derived locally and checked as a
literal substring of its precursor, and three adjudications were made against curated
databases that appear to contain errors.

**Nothing here supports a dietary, supplement or clinical claim.** Several entries describe
receptors that are drug targets; that is pharmacology, not a recommendation.
