import {complete} from "@attio/fetchable"

export function apiSuccess<T>(data: T) {
    return complete({statusCode: 200, data})
}
