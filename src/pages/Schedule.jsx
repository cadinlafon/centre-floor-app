import styled from 'styled-components';

const Page = styled.div`padding: 1.25rem;`;
const Title = styled.h1`font-family: Georgia, serif; font-size: 1.4rem; color: var(--brown-dark); margin: 0 0 0.25rem;`;
const Sub = styled.p`font-size: 0.85rem; color: var(--text-muted); margin: 0 0 1.25rem;`;
const CalendarWrapper = styled.div`
  background: var(--bg-card);
  border: 1.5px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 12px var(--shadow);

  iframe {
    width: 100%;
    height: 600px;
    border: none;
    display: block;
  }
`;

const CALENDAR_SRC = `https://calendar.google.com/calendar/embed?src=9595cc2ed11dbee0d290750537c7cf020f4bbce20c0fdcec66d74aaa18868313%40group.calendar.google.com&ctz=America%2FLos_Angeles&showTitle=0&showNav=1&showDate=1&showPrint=0&showTabs=0&showCalendars=0&showTz=0&bgcolor=%23fdf6ec&color=%23d97706`;
export default function Schedule() {
  return (
    <Page>
      <Title>Schedule</Title>
      <Sub>Tap any event to see details</Sub>
      <CalendarWrapper>
        <iframe
          src={CALENDAR_SRC}
          title="Élan Schedule"
          loading="lazy"
        />
      </CalendarWrapper>
    </Page>
  );
}
