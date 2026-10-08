// Public visibility is an explicit presentation choice, not a change to shrine routing.
// Operator questions default to visible; external visitors must opt in.
export function shouldShowAltarQuestion(isOperator, share) {
  return share === true || (isOperator && share !== false);
}

export function formatAltarQuestion(authorId, figureName, question) {
  if (typeof question !== 'string' || !question.trim()) return null;
  const trimmed = question.trim();
  if (trimmed.length > 1500) throw new Error('question_too_long');
  if (!/^\d{15,22}$/.test(String(authorId))) throw new Error('invalid_question_author');
  const target = String(figureName ?? '').trim();
  return `**Question from <@${authorId}> to ${target}:**\n${trimmed}`;
}
