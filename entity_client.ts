import axios from "axios"
import { Metadata, Spec, Status } from 'papiea-core/build/core';

async function create_entity(provider: string, kind: string, version: string, request_spec: Spec, papiea_url: string): Promise<[Metadata, Spec]> {
    const { data: { metadata, spec } } = await axios.post(`${papiea_url}/${provider}/${version}/${kind}`, {
        spec: request_spec
    });
    return [metadata, spec];
}

async function update_entity(provider: string, kind: string, version: string, request_spec: Spec, request_metadata: Metadata, papiea_url: string): Promise<[Metadata, Spec]> {
    const { data: { metadata, spec } } = await axios.put(`${papiea_url}/${provider}/${version}/${kind}/${request_metadata.uuid}`, {
        spec: request_spec,
        metadata: {
            spec_version: request_metadata.spec_version
        }
    });
    return [metadata, spec]
}

async function get_entity(provider: string, kind: string, version: string, request_metadata: Metadata, papiea_url: string): Promise<[Metadata, Spec, Status]> {
    const { data: { metadata, spec, status } } = await axios.get(`${papiea_url}/${provider}/${version}/${kind}/${request_metadata.uuid}`);
    return [metadata, spec, status]
}

async function delete_entity(provider: string, kind: string, version: string, request_metadata: Metadata, papiea_url: string): Promise<void> {
    await axios.delete(`${papiea_url}/${provider}/${version}/${kind}/${request_metadata.uuid}`);
}

async function invoker_procedure(provider: string, kind: string, version: string, procedure_name: string, input: any, request_metadata: Metadata, papiea_url: string): Promise<any> {
    const res = await axios.post(`${papiea_url}/${provider}/${version}/${kind}/${request_metadata.uuid}/procedure/${procedure_name}`, input);
    return res.data;
}

export interface EntityCRUD {
    get(metadata: Metadata):Promise<[Metadata, Spec, Status]>
    create(spec: Spec): Promise<[Metadata, Spec]>
    update(metadata: Metadata, spec: Spec): Promise<[Metadata, Spec]>
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
