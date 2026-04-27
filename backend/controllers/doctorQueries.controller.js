import repo from '../repository/dashboard.repository.js';
import { sendSuccess, sendError } from '../util/response.util.js';

function getDocId(req) {
  return req.user?.docId || req.user?.id || null;
}

export async function listQueries(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const isResolved = req.query.isResolved === 'true' ? true : (req.query.isResolved === 'false' ? false : undefined);
    const data = await repo.getAllQueriesForDoctor({ page, limit, isResolved });
    return sendSuccess(res, data, 'Queries fetched');
  } catch (err) {
    return sendError(res, err.message, err.status || 500);
  }
}

export async function getQuery(req, res) {
  try {
    const id = req.params.id;
    const data = await repo.findQueryByIdForDoctor(id);
    if (!data) return sendError(res, 'Query not found', 404);
    await repo.incrementQueryView(id);
    return sendSuccess(res, data, 'Query fetched');
  } catch (err) {
    return sendError(res, err.message, err.status || 500);
  }
}

export async function createResponse(req, res) {
  try {
    const docId = getDocId(req);
    if (!docId) return sendError(res, 'Doctor id not found', 401);
    const queryId = req.params.id;
    const { responseText } = req.body;
    if (!responseText || !String(responseText).trim()) return sendError(res, 'responseText is required', 400);
    const created = await repo.createQueryResponse({ queryId, doctorId: docId, responseText: String(responseText).trim() });
    return sendSuccess(res, created, 'Response posted', 201);
  } catch (err) {
    return sendError(res, err.message, err.status || 500);
  }
}
