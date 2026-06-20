"""Tests del parser de gates congelados (Fase 3)."""

from pathlib import Path

from enjambre.gates import load_gate, parse_gate

GATE = Path(__file__).resolve().parent.parent / "docs" / "gates" / "fase3-multiagente.md"

SAMPLE = """# Gate: demo-slice

Intro que se ignora.

## Entra
- cosa uno
- cosa dos

## NO entra
- nada de esto

## Verificacion (objetiva)
- pytest verde

## Congelado: 2026-06-19
"""


def test_parse_sections_and_title():
    g = parse_gate(SAMPLE)
    assert g.slice == "demo-slice"
    assert g.entra == ["cosa uno", "cosa dos"]
    assert g.no_entra == ["nada de esto"]
    assert g.verificacion == ["pytest verde"]
    assert g.frozen == "2026-06-19"
    assert g.is_frozen


def test_as_prompt_includes_contract():
    g = parse_gate(SAMPLE)
    p = g.as_prompt()
    assert "ENTRA" in p and "NO ENTRA" in p and "VERIFICACION" in p
    assert "cosa uno" in p


def test_unfrozen_gate():
    g = parse_gate("# Gate: x\n## Entra\n- a\n")
    assert g.frozen is None and not g.is_frozen


def test_load_real_fase3_gate():
    g = load_gate(GATE)
    assert g.slice == "fase3-multiagente"
    assert g.is_frozen
    assert g.entra and g.verificacion
