import { Metadata, Spec, Status } from 'papiea-core/build/core'
import { kind_crud_api, objectify, objectify_immutable } from './entity_client'
import axios from 'axios'

async function main() {

    const provider_prefix = 'location_provider_first'
    const kind_name = 'location'

    console.log("Create an api for location kind")
    const location_api = kind_crud_api("http://papiea:3000/services", "location_provider", "Location", "0.0.3")

    {
        console.log("\nCreate a new location...")
        const { metadata } = await location_api.create({ x: 10, y: 20 })
        console.log("\tCreated location metadata", metadata)

        let entity = await location_api.get(metadata)
        console.log("\tLocation created is:", entity)

        console.log("\nUpdate location to a new spec")
        await location_api.update(metadata, { x: 100, y: 200 })

        entity = await location_api.get(metadata)
        console.log("\tLocation update to:", entity)

        console.log("\nInvoking moveX procedure...")
        const res = await location_api.invoke_procedure("moveX", metadata, { input: 100 })
        console.log("\tProcedure returned:", res);

        entity = await location_api.get(metadata)
        console.log("\tProcedure transformed to:", entity)

        console.log("\nDeleteing the entity...")
        //Delete entity on provider with kind
        await location_api.delete(metadata);

        try {
            entity = await location_api.get(metadata)
            console.log("\tShould not see this location!", entity)
        } catch (e) {
            console.log("\tLocation not found (good, it was deleted!)", e.message)
        }
    }

    // The same exact test as above but with object representation
    {
        const location_oapi = objectify(location_api)
        console.log("\nCreate a new location...")
        let loc = await location_oapi.create({ x: 10, y: 20 })
        console.log("\tLocation created is:", loc.entity)

        console.log("\nUpdate location to a new spec")
        await loc.update({ x: 100, y: 200 })
        console.log("\tLocation update to:", loc.entity)

        console.log("\nInvoking moveX procedure...")
        const proc_res = await loc.invoke("moveX", { input: 100 })
        console.log("\tProcedure returned:", proc_res);
        console.log("\tProcedure transformed to:", loc.entity)

        console.log("\nDeleteing the entity...")
        await loc.delete()

        try {
            const entity = await location_oapi.get(loc.entity)
            console.log("\tShould not see this location!", entity)
        } catch (e) {
            console.log("\tLocation not found (good, it was deleted!)", e.message)
        }
    }
    {
        // The same exact test as above but with immutable object representation
        const location_imoapi = objectify_immutable(location_api)
        console.log("\nCreate a new location...")
        const immloc = await location_imoapi.create({ x: 10, y: 20 })
        console.log("\tLocation created is:", immloc.entity)

        console.log("\nUpdate location to a new spec")
        await immloc.update({ x: 100, y: 200 })
        console.log("\tLocation update to:", immloc.entity)

        console.log("\nInvoking moveX procedure...")
        const proc_res2 = await immloc.invoke("moveX", { input: 100 })
        console.log("\tProcedure returned:", proc_res2);
        console.log("\tProcedure original to:", immloc.entity)
        const immloc_updated = await location_imoapi.get(immloc.entity)
        console.log("\tProcedure transformed to:", immloc_updated.entity)

        console.log("\nDeleteing the entity...")
        await immloc_updated.delete()

        try {
            const entity = await location_imoapi.get(immloc_updated.entity)
            console.log("\tShould not see this location!", entity)
        } catch (e) {
            console.log("\tLocation not found (good, it was deleted!)", e.message)
        }
    }
}

main().then().catch(err => {
    console.error(err)
});