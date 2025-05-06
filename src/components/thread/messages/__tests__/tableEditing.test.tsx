import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProtectionMeasuresTable from '../ProtectionMeasuresTable';
// Mock config to avoid import.meta.env errors
jest.mock('@/lib/config', () => ({ FILE_UPLOAD_URL: 'http://localhost:8123' }));


// Dummy measures for testing
const measures = [
  { Id: 'R1', Risco: 'Risk 1', Probabilidade: 2, 'Impacto Geral': 5, 'Nível de Risco': 'Médio' },
];



describe('ProtectionMeasuresTable interactive controls', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  function setup() {
    render(
      <ProtectionMeasuresTable measures={measures} threadId="thread-123" />
    );
    return userEvent.setup();
  }

  it('triggers remove command on Remove click', async () => {
    const user = setup();
    const removeBtn = screen.getByRole('button', { name: /remove/i });
    await user.click(removeBtn);
    const cmd = screen.getByTestId('command');
    expect(cmd.textContent).toBe(JSON.stringify({ action: 'remove', id: 'R1' }));
  });

  it('prompts and triggers change command', async () => {
    const user = setup();
    // mock prompt for field and value
    const prompts: Array<string | null> = ['Fonte', 'New Source'];
    jest.spyOn(window, 'prompt').mockImplementation(() => prompts.shift() as string);

    const changeBtn = screen.getByRole('button', { name: /change/i });
    await user.click(changeBtn);

    const cmd = await screen.findByTestId('command');
    expect(JSON.parse(cmd.textContent || '')).toEqual({
      action: 'change', id: 'R1', field: 'fonte', value: 'New Source'
    });
  });

  it('prompts and triggers include command', async () => {
    const user = setup();
    jest.spyOn(window, 'prompt').mockImplementation(() => 'Extra note');

    const includeBtn = screen.getByRole('button', { name: /include/i });
    await user.click(includeBtn);

    const cmd = await screen.findByTestId('command');
    expect(JSON.parse(cmd.textContent || '')).toEqual({
      action: 'include', text: 'Extra note'
    });
  });
});
