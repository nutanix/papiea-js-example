import axios from "axios"
import { Metadata, Spec, Status, Entity_Reference } from 'papiea-core/build/core';

interface FullEntity {
    metadata:Metadata,
    spec:Spec,
    status:Status,
}

interface EntitySpec {
    metadata:Metadata,
    spec:Spec
}

type Entity = EntitySpec | FullEntity

async function create_entity(provider: string, kind: string, version: string, request_spec: Spec, papiea_url: string): Promise<EntitySpec> {
    const { data: { metadata, spec } } = await axios.post(`${papiea_url}/${provider}/${version}/${kind}`, {
        spec: request_spec
    });
    return {metadata, spec};
}

async function update_entity(provider: string, kind: string, version: string, request_spec: Spec, request_metadata: Metadata, papiea_url: string): Promise<EntitySpec> {
    const { data: { metadata, spec } } = await axios.put(`${papiea_url}/${provider}/${version}/${kind}/${request_metadata.uuid}`, {
        spec: request_spec,
        metadata: {
            spec_version: request_metadata.spec_version
        }
    });
    return {metadata, spec}
}

async function get_entity(provider: string, kind: string, version: string, request_metadata: Entity_Reference, papiea_url: string): Promise<FullEntity> {
    const { data: { metadata, spec, status } } = await axios.get(`${papiea_url}/${provider}/${version}/${kind}/${request_metadata.uuid}`);
    return {metadata, spec, status}
}

async function delete_entity(provider: string, kind: string, version: string, request_metadata: Entity_Reference, papiea_url: string): Promise<void> {
    await axios.delete(`${papiea_url}/${provider}/${version}/${kind}/${request_metadata.uuid}`);
}

async function invoker_procedure(provider: string, kind: string, version: string, procedure_name: string, input: any, request_metadata: Metadata, papiea_url: string): Promise<any> {
    const res = await axios.post(`${papiea_url}/${provider}/${version}/${kind}/${request_metadata.uuid}/procedure/${procedure_name}`, input);
    return res.data;
}

// map based crud
export interface EntityCRUD {
    get(metadata: Entity_Reference):Promise<FullEntity>
    create(spec: Spec): Promise<EntitySpec>
    update(metadata: Metadata, spec: Spec): Promise<EntitySpec>
    delete(metadata: Metadata): Promise<void>
    invoke_procedure(procedure_name: string, metadata: Metadata, input: any): Promise<any>
}

export function kind_client(papiea_url: string, provider: string, kind: string, version: string): EntityCRUD {
    const crudder: EntityCRUD = {
        get: (metadata: Metadata) => get_entity(provider, kind, version, metadata, papiea_url),
        create: (spec: Spec) => create_entity(provider, kind, version, spec, papiea_url),
        update: (metadata: Metadata, spec: Spec) => update_entity(provider, kind, version, spec, metadata, papiea_url),
        delete: (metadata: Metadata) => delete_entity(provider, kind, version, metadata, papiea_url),
        invoke_procedure: (proc_name: string, metadata: Metadata, input: any) => invoker_procedure(provider, kind, version, proc_name, input, metadata, papiea_url)
    }
    return crudder
}

// class based crud
interface EntityObjectCRUD {
    update(spec: Spec):Promise<EntityObjectCRUD>
    delete():Promise<void>
    invoke(procedure_name:string, input:any):Promise<any>
}

export class ImmutableEntityObject implements EntityObjectCRUD{
    readonly entity: Entity 
    readonly crud:EntityCRUD

    constructor(e:Entity, c:EntityCRUD) {
        this.entity=e
        this.crud=c
    }

    async refresh():Promise<ImmutableEntityObject> {
        return new ImmutableEntityObject(await this.crud.get(this.entity.metadata), this.crud)
    }

    async update(spec: any): Promise<ImmutableEntityObject> {
        return this.crud.update(this.entity.metadata, spec).then(_=>this.refresh())
    }
    
    delete(): Promise<void> {
        return this.crud.delete(this.entity.metadata)
    }

    invoke(procedure_name: string, input: any): Promise<any> {
        return this.crud.invoke_procedure(procedure_name, this.entity.metadata, input)
    }
}

interface ImmutableEntityObjectBuilder {
    create(spec:Spec):Promise<ImmutableEntityObject>
    get(metadata:Entity_Reference):Promise<ImmutableEntityObject>
}

export function objectify(c:EntityCRUD): ImmutableEntityObjectBuilder{
   return {
        create: async (spec:Spec) => new ImmutableEntityObject(await c.create(spec), c).refresh(),
        get: async (metadata:Entity_Reference) => new ImmutableEntityObject(await c.get(metadata), c)
    }
}
