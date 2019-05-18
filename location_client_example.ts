import { Metadata, Spec, Status } from 'papiea-core/build/core'
import { kind_crud_api } from './entity_client'
import axios from 'axios'

function entity_obj(xs: any): any {
    return { metadata: xs[0], spec: xs[1], status: xs[2] }
}

async function main() {

    const provider_prefix = 'location_provider_first'
    const kind_name = 'location'

    console.log("Create an api for location kind")
    const location_api = kind_crud_api("http://papiea:3000/services", "location_provider", "Location", "0.0.3")

    console.log("\nCreate a new location...")
    const [metadata] = await location_api.create({ x: 10, y: 20 })
    console.log("\tCreated location metadata", metadata)

    let entity = entity_obj(await location_api.get(metadata))
    console.log("\tLocation created is:", entity)

    console.log("\nUpdate location to a new spec")
    await location_api.update(metadata, { x: 100, y: 200 })

    entity = entity_obj(await location_api.get(metadata))
    console.log("\tLocation update to:", entity)

    console.log("\nInvoking moveX procedure...")
    const res = await location_api.invoke_procedure("moveX", metadata, { input: 100 })
    console.log("\tProcedure returned:", res);

    entity = entity_obj(await location_api.get(metadata))
    console.log("\tProcedure transformed to:", entity)

    console.log("\nDeleteing the entity...")
    //Delete entity on provider with kind
    await location_api.delete(metadata);

    try {
        entity = entity_obj(await location_api.get(metadata))
        console.log("\tShould not see this location!", entity)
    } catch (e) {
        console.log("\tLocation not found (good, it was deleted!)", e.message)
    }
}

main().then().catch(err => {
    console.error(err)
});