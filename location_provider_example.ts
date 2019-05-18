import { ProviderSdk, Kind_Builder } from 'papiea-core'
import { Procedural_Execution_Strategy } from 'papiea-core/build/papiea'
import axios from 'axios'

async function main() {
  console.log("Starting up.. Connecting to Papiea")

  // These ips are the names of the docker containers, please see docker-compose.yml
  const sdk = ProviderSdk.create_sdk("papiea", 3000, "location-example", 9999)

  sdk.version('0.0.3')
  sdk.prefix('location_provider')

  const location_ent = {
    Location: {
      type: 'object',
      title: 'X/Y Location',
      description: 'Stores an XY location of something',
      'x-papiea-entity': 'spec-only',
      required: ['x', 'y'],
      properties: {
        x: { type: 'number' },
        y: { type: 'number' }
      }
    }
  }

  const location = sdk.new_kind(location_ent);

  location.entity_procedure('moveX', {}, Procedural_Execution_Strategy.Halt_Intentful,
    {
      MoveInput: {
        type: 'number',
        title: 'Input value to move functions',
        description: 'The amount to move in a particular direction'
      }
    },
    location_ent,
    async (ctx, entity, input) => {
      entity.spec.x += input;
      const res = await axios.put(ctx.url_for(entity), {
        spec: entity.spec,
        metadata: entity.metadata
      });

      return res.data;
    })
  sdk.register().catch(e => console.error(e))
}

main().then().catch(err => {
  console.error(err)
});