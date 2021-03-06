/**
 * Channel.ts
 *
 * Channel describes the communication channel between the host code (Oni) and the plugin code.
 *
 * The channel interfaces are meant to be transport-agnostic - meaning that we could implement them
 * as in-process, over websockets, over IPC, etc - this gives us lots of flexibility in terms of how
 * plugins are managed.
 */

import { EventEmitter } from "events"

import * as Capabilities from "./Capabilities"

/**
 * Interface that describes a strategy for sending data
 * to the main process from the plugin
 */
export interface IPluginChannel {

    metadata: Capabilities.IPluginMetadata

    send(type: string, originalEventContext: any, payload: any): void
    sendError(type: string, originalEventContext: any, error: string): void

    onRequest(requestCallback: (arg: any) => void): void
}

export interface IHostChannel {
    send(message: any, filter: Capabilities.IPluginFilter): void

    onResponse(responseCallback: (arg: any) => void): void
}

export interface PluginActivationFunction {
    (): void
}

export interface IChannel {
    host: IHostChannel
    createPluginChannel(metadata: Capabilities.IPluginMetadata, activationFunction: PluginActivationFunction): IPluginChannel
}

export interface InProcessPluginInfo {
    channel: InProcessPluginChannel
    activationFunction: PluginActivationFunction
    isActivated?: boolean
}

export class InProcessChannel implements IChannel {

    private _pluginChannels: InProcessPluginInfo[] = []

    public get host(): IHostChannel {
        return this._hostChannel
    }

    constructor(
        private _hostChannel: InProcessHostChannel = new InProcessHostChannel(),
    ) {

        this._hostChannel.on("send-request", (arg: any, filter: Capabilities.IPluginFilter) => {
            setTimeout(() => {
                const pluginsToBroadcast = this._getChannelsForRequestFromHost(filter)

                pluginsToBroadcast.forEach((plugin) => {
                    this._activateIfNecessary(plugin)
                    plugin.channel.emit("host-request", arg)
                })
            }, 0)
        })
    }

    public createPluginChannel(metadata: Capabilities.IPluginMetadata, onActivate: PluginActivationFunction): IPluginChannel {
        const channel = new InProcessPluginChannel(metadata)

        this._pluginChannels.push({
            channel,
            isActivated: false,
            activationFunction: onActivate,
        })

        channel.on("send", (arg: any) => {
            setTimeout(() => this._hostChannel.emit("plugin-response", arg), 0)
        })

        channel.on("send-error", (arg: any) => {
            setTimeout(() => this._hostChannel.emit("plugin-response", arg), 0)
        })

        return channel
    }

    private _activateIfNecessary(info: InProcessPluginInfo): void {
        if (!info.isActivated) {
            info.activationFunction()
            info.isActivated = true
        }
    }

    private _getChannelsForRequestFromHost(filter: Capabilities.IPluginFilter): InProcessPluginInfo[] {
        let potentialPlugins = this._pluginChannels
            .filter((p) => Capabilities.doesMetadataMatchFilter(p.channel.metadata, filter))

        return potentialPlugins
    }
}

export class InProcessHostChannel extends EventEmitter implements IHostChannel {
    public send(arg: any, filter: Capabilities.IPluginFilter): void {
        this.emit("send-request", arg, filter)
    }

    public onResponse(responseCallback: (arg: any) => void): void {
        this.on("plugin-response", responseCallback)
    }
}

export class InProcessPluginChannel extends EventEmitter implements IPluginChannel {

    constructor(
        private _metadata: Capabilities.IPluginMetadata,
    ) {
        super()
    }

    public get metadata(): Capabilities.IPluginMetadata {
        return this._metadata
    }

    public onRequest(requestCallback: (arg: any) => void): void {
        this.on("host-request", requestCallback)
    }

    public send(type: string, originalEventContext: any, payload: any): void {
        this.emit("send", {
            type,
            meta: {
                originEvent: originalEventContext,
            },
            payload,
        })
    }

    public sendError(type: string, originalEventContext: any, error: string): void {
        this.emit("send-error", {
            type,
            meta: {
                originEvent: originalEventContext,
            },
            error,
        })
    }
}
