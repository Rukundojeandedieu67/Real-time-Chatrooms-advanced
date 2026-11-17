from drf_spectacular.utils import OpenApiResponse, extend_schema


def documented(tag, summary, *, request=None, responses=None, auth=True, parameters=None):
    documented_responses = {
        400: OpenApiResponse(description="Validation error"),
        401: OpenApiResponse(description="Missing or invalid token"),
        429: OpenApiResponse(description="Rate limited. Retry-After is set."),
    }
    if responses:
        documented_responses.update(responses)
    kwargs = {"tags": [tag], "summary": summary, "responses": documented_responses}
    if request is not None:
        kwargs["request"] = request
    if parameters is not None:
        kwargs["parameters"] = parameters
    if not auth:
        kwargs["auth"] = []
    return extend_schema(**kwargs)
