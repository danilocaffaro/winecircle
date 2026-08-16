/// <reference path="../pb_data/types.d.ts" />

// Catálogo de vinhos local
//
// O app dependia do Gemini para duas coisas: completar o nome enquanto você
// digita e preencher produtor/região/uva/safra ao adicionar um vinho. Nenhuma
// delas está no ciclo principal, mas ambas exigiam uma chave de API — que
// esteve pública por meses dentro do bundle.
//
// Este catálogo resolve as duas sem chave nenhuma, com ~245 mil vinhos reais
// unidos de duas fontes abertas (ver scripts/importar-catalogo.mjs). O que ele
// não faz é envelhecer bem: as fontes param em 2019. Por isso `source` marca a
// origem — 'we' e 'rt' vêm dos datasets, 'ai' vem de uma resolução em tempo
// real que foi gravada de volta. É essa gravação que mantém o catálogo vivo:
// ele aprende com o que o seu grupo realmente bebe.

migrate((app) => {
  const collection = new Collection({
    "type": "base",
    "id": "pbc_wine_catalog",
    "name": "wc_wine_catalog",
    // Qualquer pessoa logada consulta; ninguém escreve pela API.
    // A gravação de volta acontece nos hooks, que rodam com privilégio.
    "listRule": "@request.auth.id != \"\"",
    "viewRule": "@request.auth.id != \"\"",
    "createRule": null,
    "updateRule": null,
    "deleteRule": null,
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}", "hidden": false, "id": "text3208210256",
        "max": 15, "min": 15, "name": "id", "pattern": "^[a-z0-9]+$",
        "presentable": false, "primaryKey": true, "required": true, "system": true, "type": "text"
      },
      {
        "autogeneratePattern": "", "hidden": false, "id": "text_cat_name", "max": 300, "min": 0,
        "name": "name", "pattern": "", "presentable": true, "primaryKey": false,
        "required": true, "system": false, "type": "text"
      },
      {
        // Nome normalizado (minúsculo, sem acento) — é sobre esta coluna que a
        // busca roda, para "chateau" achar "Château".
        "autogeneratePattern": "", "hidden": false, "id": "text_cat_search", "max": 300, "min": 0,
        "name": "search", "pattern": "", "presentable": false, "primaryKey": false,
        "required": true, "system": false, "type": "text"
      },
      { "autogeneratePattern": "", "hidden": false, "id": "text_cat_winery", "max": 200, "min": 0,
        "name": "winery", "pattern": "", "presentable": false, "primaryKey": false,
        "required": false, "system": false, "type": "text" },
      { "autogeneratePattern": "", "hidden": false, "id": "text_cat_grape", "max": 200, "min": 0,
        "name": "grape", "pattern": "", "presentable": false, "primaryKey": false,
        "required": false, "system": false, "type": "text" },
      { "autogeneratePattern": "", "hidden": false, "id": "text_cat_country", "max": 100, "min": 0,
        "name": "country", "pattern": "", "presentable": false, "primaryKey": false,
        "required": false, "system": false, "type": "text" },
      { "autogeneratePattern": "", "hidden": false, "id": "text_cat_region", "max": 200, "min": 0,
        "name": "region", "pattern": "", "presentable": false, "primaryKey": false,
        "required": false, "system": false, "type": "text" },
      { "hidden": false, "id": "number_cat_year", "max": null, "min": null, "name": "year",
        "onlyInt": true, "presentable": false, "required": false, "system": false, "type": "number" },
      { "hidden": false, "id": "number_cat_points", "max": null, "min": null, "name": "points",
        "onlyInt": true, "presentable": false, "required": false, "system": false, "type": "number" },
      { "hidden": false, "id": "number_cat_price", "max": null, "min": null, "name": "price",
        "onlyInt": false, "presentable": false, "required": false, "system": false, "type": "number" },
      { "autogeneratePattern": "", "hidden": false, "id": "text_cat_notes", "max": 800, "min": 0,
        "name": "notes", "pattern": "", "presentable": false, "primaryKey": false,
        "required": false, "system": false, "type": "text" },
      { "hidden": false, "id": "select_cat_type", "maxSelect": 1, "name": "type",
        "presentable": false, "required": false, "system": false, "type": "select",
        "values": ["red", "white", "rosé", "sparkling", "dessert", "orange"] },
      { "hidden": false, "id": "select_cat_source", "maxSelect": 1, "name": "source",
        "presentable": false, "required": false, "system": false, "type": "select",
        "values": ["we", "rt", "ai"] },
      { "hidden": false, "id": "autodate_cat_created", "name": "created",
        "onCreate": true, "onUpdate": false, "presentable": false, "system": false, "type": "autodate" },
      { "hidden": false, "id": "autodate_cat_updated", "name": "updated",
        "onCreate": true, "onUpdate": true, "presentable": false, "system": false, "type": "autodate" }
    ],
    "indexes": [
      "CREATE INDEX `idx_wc_catalog_search` ON `wc_wine_catalog` (`search`)",
      "CREATE UNIQUE INDEX `idx_wc_catalog_name` ON `wc_wine_catalog` (`name`)",
      "CREATE INDEX `idx_wc_catalog_points` ON `wc_wine_catalog` (`points`)"
    ],
    "system": false
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_wine_catalog");

  return app.delete(collection);
})
