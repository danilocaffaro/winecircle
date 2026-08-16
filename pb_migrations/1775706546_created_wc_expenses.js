/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": null,
    "deleteRule": null,
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "hidden": false,
        "id": "text3208210256",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "cascadeDelete": true,
        "collectionId": "pbc_2136773829",
        "hidden": false,
        "id": "relation1001261735",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "event",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "hidden": false,
        "id": "number1186288468",
        "max": null,
        "min": 0,
        "name": "total_amount",
        "onlyInt": false,
        "presentable": false,
        "required": true,
        "system": false,
        "type": "number"
      },
      {
        "cascadeDelete": false,
        "collectionId": "_pb_users_auth_",
        "hidden": false,
        "id": "relation2335707122",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "paid_by",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "hidden": false,
        "id": "select274183682",
        "maxSelect": 1,
        "name": "split_type",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "equal",
          "custom"
        ]
      },
      {
        "hidden": false,
        "id": "json1896815203",
        "maxSize": 0,
        "name": "splits",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
      }
    ],
    "id": "pbc_2598422542",
    "indexes": [],
    "listRule": null,
    "name": "wc_expenses",
    "system": false,
    "type": "base",
    "updateRule": null,
    "viewRule": null
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2598422542");

  return app.delete(collection);
})
