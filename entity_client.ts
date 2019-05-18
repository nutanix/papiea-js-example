import axios from "axios"
import { Metadata, Spec, Status } from 'papiea-core/build/core';

interface FullEntity {
    metadata:Metadata,
    spec:Spec,
    status:Status,
}

interface SpecOnlyEntity {
    metadata:Metadata,
    spec:Spec
}

interface EntityRef {
    metadata:Metadata
}

type Entity = EntityRef | SpecOnlyEntity | FullEntity

async function create_entity(provider: string, kind: string, version: string, request_spec: Spec, papiea_url: string): Promise<SpecOnlyEntity> {
    const { data: { metadata, spec } } = await axios.post(`${papiea_url}/${provider}/${version}/${kind}`, {
        spec: request_spec
    });
    return {metadata, spec};
}

async function update_entity(provider: string, kind: string, version: string, request_spec: Spec, request_metadata: Metadata, papiea_url: string): Promise<SpecOnlyEntity> {
    const { data: { metadata, spec } } = await axios.put(`${papiea_url}/${provider}/${version}/${kind}/${request_metadata.uuid}`, {
        spec: request_spec,
        metadata: {
            spec_version: request_metadata.spec_version
        }
    });
    return {metadata, spec}
}

async function get_entity(provider: string, kind: string, version: string, request_metadata: Metadata, papiea_url: string): Promise<FullEntity> {
    const { data: { metadata, spec, status } } = await axios.get(`${papiea_url}/${provider}/${version}/${kind}/${request_metadata.uuid}`);
    return {metadata, spec, status}
}

async function delete_entity(provider: string, kind: string, version: string, request_metadata: Metadata, papiea_url: string): Promise<void> {
    await axios.delete(`${papiea_url}/${provider}/${version}/${kind}/${request_metadata.uuid}`);
}

async function invoker_procedure(provider: string, kind: string, version: string, procedure_name: string, input: any, request_metadata: Metadata, papiea_url: string): Promise<any> {
    const res = await axios.post(`${papiea_url}/${provider}/${version}/${kind}/${request_metadata.uuid}/procedure/${procedure_name}`, input);
    return res.data;
}

// map based crud
export interface EntityCRUD {
    get(metadata: Metadata):Promise<FullEntity>
    create(spec: Spec): Promise<SpecOnlyEntity>
    update(metadata: Metadata, spec: Spec): Promise<SpecOnlyEntity>
    delete(metadata: Metadata): Promise<void>
    invoke_procedure(procedure_name: string, metadata: Metadata, input: any): Promise<any>
}

export function kind_crud_api(papiea_url: string, provider: string, kind: string, version: string): EntityCRUD {
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
    refresh():Promise<EntityObjectCRUD>
    invoke(procedure_name:string, input:any):Promise<any>
}

export class MutableEntityObject implements EntityObjectCRUD{
    entity: Entity 
    crud:EntityCRUD

    constructor(e:Entity, c:EntityCRUD) {
        this.entity=e
        this.crud=c
    }
    
    static async create(c:EntityCRUD, spec:Spec):Promise<MutableEntityObject> {
        const {metadata} = await c.create(spec)
        return MutableEntityObject.get(c, metadata)
    }

    static async get(c:EntityCRUD, metadata:Metadata):Promise<MutableEntityObject>{
        return new MutableEntityObject(await c.get(metadata), c)
    }

    async refresh():Promise<MutableEntityObject> {
        this.entity = await this.crud.get((this.entity as EntityRef).metadata)
        return this
    }

    async update(spec: any): Promise<MutableEntityObject> {
        const res = await this.crud.update((this.entity as EntityRef).metadata, spec)
        return this.refresh()
    }
    
    async delete(): Promise<void> {
        return this.crud.delete((this.entity as EntityRef).metadata)
    }

    async invoke(procedure_name: string, input: any): Promise<any> {
        const ret = this.crud.invoke_procedure(procedure_name, (this.entity as EntityRef).metadata, input)
        this.refresh()
        return ret
    }
}

interface EntityObjectBuilder {
    create(spec:Spec):Promise<MutableEntityObject>
    get(metadata:EntityRef):Promise<MutableEntityObject>
}

export function objectify(c:EntityCRUD): EntityObjectBuilder{
    const ret: EntityObjectBuilder = {
        create: (spec:Spec) => MutableEntityObject.create(c,spec),
        get: (metadata:EntityRef) => MutableEntityObject.get(c, metadata.metadata)
    }
    return ret
}

export class ImmutableEntityObject implements EntityObjectCRUD{
    readonly entity: Entity 
    readonly crud:EntityCRUD

    constructor(e:Entity, c:EntityCRUD) {
        this.entity=e
        this.crud=c
    }
    
    static async create(c:EntityCRUD, spec:Spec):Promise<ImmutableEntityObject> {
        const {metadata} = await c.create(spec)
        return ImmutableEntityObject.get(c, metadata)
    }

    static async get(c:EntityCRUD, metadata:Metadata):Promise<ImmutableEntityObject>{
        return new ImmutableEntityObject(await c.get(metadata), c)
    }

    async refresh():Promise<ImmutableEntityObject> {
        return ImmutableEntityObject.get(this.crud, ((this.entity as EntityRef).metadata))   
    }

    async update(spec: any): Promise<ImmutableEntityObject> {
        await this.crud.update((this.entity as EntityRef).metadata, spec)
        return this.refresh()
    }
    
    async delete(): Promise<void> {
        return this.crud.delete((this.entity as EntityRef).metadata)
    }

    async invoke(procedure_name: string, input: any): Promise<any> {
        const ret = this.crud.invoke_procedure(procedure_name, (this.entity as EntityRef).metadata, input)
        return ret
    }
}

interface ImmutableEntityObjectBuilder {
    create(spec:Spec):Promise<ImmutableEntityObject>
    get(metadata:EntityRef):Promise<ImmutableEntityObject>
}

export function objectify_immutable(c:EntityCRUD): ImmutableEntityObjectBuilder{
    const ret: ImmutableEntityObjectBuilder = {
        create: (spec:Spec) => ImmutableEntityObject.create(c,spec),
        get: (metadata:EntityRef) => ImmutableEntityObject.get(c, metadata.metadata)
    }
    return ret
}
