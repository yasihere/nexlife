import { setActiveTag } from '../lib/tagIntent';
import { push } from '../lib/nav';

interface TagChipProps {
  tag: string;
  className?: string;
}

/**
 * A #tag rendered as a link to every saved entry carrying it (TagView.tsx).
 * Pure read-only display only — editing contexts keep their own tap
 * behaviour on purpose: EntrySheet's tag chips remove the tag, FilterBar's
 * toggle a filter. Same bare text styling those already use, just tappable.
 */
export default function TagChip({ tag, className = '' }: TagChipProps) {
  function open(): void {
    setActiveTag(tag);
    push('tag');
  }

  return (
    <button
      type="button"
      onClick={open}
      className={'inline-flex min-h-[44px] items-center text-title text-paper ' + className}
    >
      #{tag}
    </button>
  );
}
